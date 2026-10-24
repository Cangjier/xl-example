# HANDOFF — impl-wp7c-1（WP-7 C/D 组第一波）

STATUS: PARTIAL（阶段 3 完成一个已绿批次；阶段 1 盘清完成；阶段 2/4/5 未开始）
BRANCH: `impl-wp7c-1`
HEAD: `84bb69df`（C-1a）
BASE: `impl-wp7b @ 7b579661`（= `refactor-integration @ 90354756` + B 组 7 个删除）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-1`
未 merge、未 push。

## 1. 本轮交付（已绿、已 commit）

**C-1a：删 18 个 C 组语句桩 + source-file-shape 的 18 行死 import**

- 删 `typescript/tokens/statements/{block,break-statement,continue-statement,debugger-statement,do-statement,empty-statement,for-statement,for-in-statement,for-of-statement,if-statement,labeled-statement,return-statement,switch-statement,throw-statement,try-statement,variable-statement,while-statement,with-statement}-possible-shape.xl.md`
- `source-file-shape.xl.md`：删对应 18 行 import（**行为零变化**：这些类在全仓 `*.xl.md` 里除 import 行外 **0 处非注释引用**，`CreatePossibleShapes()` 里它们本来就被注释掉了）
- 手工清掉 18 个 `dist/ts/**.ts` 与 `build/ts/**.js` 残留（xl_build 不会删已删源文件的产物）
- **possible 文件 48 → 30**

死引用证明脚本（可复现，本轮实际用过）：

```powershell
$n='block',...; foreach($x in $n){ $f="typescript/tokens/statements/$x-possible-shape.xl.md"
  $cls=(Select-String -Path $f -Pattern 'class (\w+PossibleShape)' | Select-Object -First 1).Matches.Groups[1].Value
  (git grep -n "\b$cls\b" -- '*.xl.md' | Where-Object { $_ -notmatch [regex]::Escape("$x-possible-shape.xl.md") -and $_ -notmatch ':\s*//' }).Count }  # 全 0
```

## 2. 门禁读数（commit 84bb69df，清 dist 后 force 重建）

| 项 | 读数 | 判定 |
|---|---|---|
| xl_build（`paths=["core","typescript"]`, `out="dist"`, force） | **520 written / 0 error** / 1367 warning；18 条 E2004 orphan（只是 cache 残记，产物已手动删） | PASS |
| tsc | exit 0（3.4 s） | PASS |
| AST 全量 | **6167/6167**，结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts | **226/226**，崩溃 0 | PASS |
| item-oracle | 454 前缀 | PASS |
| batch-split | 70 段 / 837 断言 / 0 失败 | PASS |
| stream-proof | 146 / 0 | PASS |
| `gates.ps1 -Tier standard` | **RESULT: PASS**（tests/gates 1/8 基线 KNOWN-RED） | PASS |
| Xl 文件数 | `git ls-files '*.xl.md'` = **521**（core+typescript 编译产物 520） | 记录 |

基线（删除前，同分支 7b579661）：standard PASS、6167/0/0/0、real-dts 226 —— 与删后逐项相同。

## 3. 阶段 1 盘清结论（下一棒直接可用，**省一轮**）

### 3.1 剩余 30 个 `*possible*.xl.md` 的真实处境

**没有一个是"零引用可删"了**。全部 30 个都挂在同一条链上：

```
SourceFileShape.CreatePossibleShapes()  →  SourceFileBodyItemHost.CreateRules(...)
                                        →  root-item-rule.SourceFileBodyItemHost.Guide: CatalogGuide
                                        →  Guide.PossibleShapes[i].ComputeByIndex(...)   ← 根 item 引擎的判据表
```

关键事实（**与任务书的前提不同，必须先知道**）：
`root-item-rule.xl.md`（1173 行）**本身就是用 `Array<PossibleShape>` + `CatalogGuide` 驱动的**，
它把候选表当"item 规则表"用（`Classify` / `Extend` / `Analyze` 逐 shape 调 `ComputeByIndex`）。
也就是说：**根壳不是在跑"legacy 逐 token 扫描"，它跑的是 item 引擎，但 item 引擎的规则类型就是 `PossibleShape`。**
→ 因此"把壳切到 item rule"对根壳不成立；要删根系的 14 个声明级 possible，得先把
`PossibleShape`/`CatalogGuide` 这套**类型协议**换成不带 possible 语义的 item-rule 抽象
（`IItemRule` 之类），这是 D 组的协议重塑，**不是机械删除**。

### 3.2 仍有 legacy 逐 token CatalogGuide 路径的**只有 3 个壳**（阶段 2 的真目标）

这 3 个 `CatalogGuide` 挂载点所在宿主**从不设 `BatchAdapter`**，所以
`UnitToken.OnBasicTokenClosed` 走 `super`（`Token.OnBasicTokenClosed:128` → `parent.ComputePossibleShapes` → `CatalogGuide`）：

| 壳 | 行 | 挂载内容 | 依赖的 possible |
|---|---|---|---|
| `declarations/import-clause-shape` | 37 | `new CatalogGuide([NamedImportsPossibleShape, NamespaceImportPossibleShape], new ImportClauseEndPossibleShape())` | `named-imports-possible`、`namespace-import-possible`、`import-clause-end-possible` |
| `declarations/import-declaration-shape` | 62 | `CreatePossibleShapes()` + `ImportDeclarationEndPossibleShape` | 同上族 |
| `declarations/export-declaration-shape` | 54 | `CreatePossibleShapes()` + `ExportDeclarationEndPossibleShape` | `export-declaration-possible`、`export-declaration-end-possible` |

另有 `body-guide-util.MountBodyGuide`（L119–127，`bracket.CatalogGuide = guide`）——类/接口/枚举体用它的宿主**已挂 item 表**，
但 `MountBodyGuide` 仍被调用（`class-*`/`interface-*`/`type-literal` 等），删它要同时改所有调用点。

### 3.3 剩余 30 个文件归类（供下一棒排期）

| 数 | 文件 | 删它的前置 |
|---|---|---|
| 14 | `declarations/{class,enum,export-assignment,export-declaration,export-declaration-end,function,import-attributes,import-clause-end,import-clause,import-declaration,import-declaration-end,import-equals,interface,module,named-exports,named-imports,namespace-export,namespace-export-declaration,namespace-import,type-alias}-possible` 中去重后的活体（含 `import-attributes`）| 根 item 规则表换协议（见 3.1）|
| 3 | 上表 3 个壳的 `*-end` / `named-*` / `namespace-*` | 先给这 3 个宿主挂 item 适配器，或写等价直接算法（阶段 2 真正可做的一步） |
| 3 | 白名单 `expressions/class-expression-possible`、`jsdoc/jsdoc-class-tag-possible`、`keywords/class-keyword-possible` | **保留**（任务书要求） |
| 2 | `statements/statement-possible`、`statements/expression-statement-possible` | `StatementScanner` / `StatementBuilder` 的判据主体，`IsAsiBoundary` 等被 `statement-builder/scanner`、`source-file-tail-builder` 调用 |
| 1 | `literals/string-literal-possible` | 被 export/import 壳 import（`CreatePossibleShapes` 里活体） |
| 4 | `core/syntax/{catalog-guide,possible-shape,possible-shape-cache,i-compute-possible-shapes,compute-possible-shapes-states}`（5 个，含 cache） | D 组，见下 |
| 1 | `typescript/tokens/items/*` 的 `PossibleShapeCache` 引用（`class-member-item-util` 12、`member-item-util` 19、`root-item-rule` 20、`source-file-tail-builder` 21） | 随 3.1 的协议重塑一起改指 |

> 注意：本轮全量清单里的"类名 0 命中"多数是**类名提取脚本抓错了 class**（文件里第一个 `class` 常是 `XxxScan` 辅助类），
> 不要据此判死。正确做法：`git grep -n 'XxxPossibleShape' -- '*.xl.md'`，并排除注释行。

### 3.4 D 组现状（阶段 4 的前置）

- `syntax-context.BatchMode` **默认已是 1**（不是 0）。legacy 只在 `BatchAdapter === null` 时生效 —— 这就是 3.2 那 3 个壳。
- `BatchMode === 0` 分支仍在：`unit-token.OnBasicTokenClosed:72`、`statement-block-stream:54`、`statement-builder:1247/1258/2197`。
- `LegacyBatchAdapter` / `ShadowCompare` 仍被 `syntax-context`（`Shadow` 字段）、`unit-token`、`batch/i-batch-host` 引用。
- 9 个 basic token 仍 import `compute-possible-shapes-states` + `i-compute-possible-shapes`；
  `token.xl.md:128-130` 的 `"ComputePossibleShapes" in this` 兜底仍在。
- 结论：**D 组不能先删**。顺序必须是 3.2 壳切完 → 根规则表换协议（3.1）→ 才能动 core 协议。

## 4. 下一棒建议顺序（每步一个 commit，绿了再走）

1. **C-1b（最小、最可能绿）**：`import-clause-shape` 单壳。给它挂一个 `ClauseItemHost`（`items/clause-item-rule` 已有），
   删它的 `CatalogGuide` 行 + 3 个 possible import；跑 batch-split `--family=clause` + standard。绿了再动 import/export 另两个。
2. **C-1c**：`import-declaration-shape`、`export-declaration-shape` 同上（这两个的 `CreatePossibleShapes()` 还牵着 14 个声明级文件，只能先卸 CatalogGuide、保留 `CreatePossibleShapes` 供根表用）。
3. **D-1（协议重塑，最大的一块）**：把 `possible-shape` 的 `ComputeByIndex/BuildByIndex` 契约抽成 `IItemRule`，
   `root-item-rule` 改吃 `Array<IItemRule>`；`catalog-guide` 降为 `ItemRuleGuide` 或并入 `item-state-cache`。
   这一步做完，14+2+1 个 possible 才能一起删。
4. **D-2**：删 `core/syntax/{catalog-guide,possible-shape,possible-shape-cache,i-compute-possible-shapes,compute-possible-shapes-states}`、
   `UnitToken.CatalogGuide` 字段、`token.xl.md` 兜底、9 个 basic token 的两行 import、`BatchMode` 0/2 分支与 `LegacyBatchAdapter`/`ShadowCompare`。
5. **E**：`tests/cache-share`、`tests/member-possible` 随 D-2 同 commit 删（不在 8 道门里）。

## 5. 踩坑（本轮实际踩到）

1. **PowerShell 写 `*.xl.md` 会带 CRLF → xl_build 直接 E1006**（`source file contains a carriage return; *.xl.md uses LF line endings`）。
   改文件必须：`$t=$t -replace "`r`n","`n"; [IO.File]::WriteAllText($p,$t,(New-Object Text.UTF8Encoding($false)))`。
   用 `edit` 工具改则安全（它按原样字节写，但要确认原文件本身是 LF）。
2. `xl_build(force=true)` **不删**已删源文件的产物 → 必须先手动删 `dist/ts/**` 与 `build/ts/**` 同名 `.ts/.js`；
   否则 tsc 仍编译旧文件 = 假绿。删后 xl_build 会报 18 条 **E2004 orphan**（仅 cache 残记，不是错误），
   想清掉用 `xl_orphans(prune:true)`。
3. `xl_build` 输出巨大（18 万字节），一条 pwsh 里只看尾部；不要把整段输出留在上下文里。
4. `git grep -ln 'PossibleShape' -- '*.xl.md'` 会连"只 import 不用"和注释一起算；判死要按类名 + 排除 `//` 行。
5. `git rm` 已进 index，随后 `git add <具体路径>` 是安全的（7b 的坑只在 revert 后重 stage 时才出现）。

## 6. 未完成（明确交接清单）

- 阶段 2：3 个 CatalogGuide 壳**一个都没切**（方案已写死在 §3.2 / §4-1）。
- 阶段 3：30 个 possible 仍在，无一可机械删。
- 阶段 4：core 5 个协议 + `BatchMode`/legacy/shadow **全部未动**。
- 阶段 5 收口 grep：`git grep -nE 'PossibleShape|ComputePossibleShapes|CatalogGuide|LegacyBatchAdapter|ShadowCompare' -- '*.xl.md'` 目前 **67 个文件命中**（`PossibleShape|ComputePossibleShapes|CatalogGuide|LegacyBatchAdapter|ShadowCompare` 去重文件数，未清零）。
