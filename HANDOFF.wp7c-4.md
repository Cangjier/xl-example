# HANDOFF — impl-wp7c-4（WP-7 C/D 组第四波，只做 import-clause 壳）

STATUS: **COMPLETE** —— `import-clause-shape` 已与 possible 族脱钩；4 个 clause 系 possible 删除；全量 standard PASS
BRANCH: `impl-wp7c-4` @ `d40832c8`（代码）+ 本文件所在 docs commit
BASE: `impl-wp7c-3 @ c46cecad`
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-4`
未 merge、未 push。

## 0. 起点重建验证（本轮第一步，自己实测，不是抄前任）

清空思路：先 `xl_build(force)`（514 written / 0 error）→ `tsc` exit 0 → 全量 `ast-json` + `ast-json-diff`
→ `real-dts-ast`：**6167/6167、结构 0 / 位置 0 / 字段 0；real-dts 226/226、崩溃 0**。
基线绿后才动手，与 `HANDOFF.wp7c-3.md` §0 的读数一致。

## 1. 决定性发现：import-clause 的「挂载路径」已经死了（纠正任务书前提）

任务书要求「按 wp7c-2 的移植物重写：`{` 时 `OnBracketCreatedEvent` 认领括号、`* as` 走 NamespaceImport、
`from` 收口」。本轮实测这条路径**已经不可达**，因此没有写那套 `OnBracketCreatedEvent`（写了就是死代码）：

1. `ImportClauseShape` 全仓只有一处 `new`：`import-declaration-shape.xl.md:149`（`FromUnits` 直接建造路径）。
   `git grep -n "ImportClauseShape" -- '*.xl.md'` 只有：
   `import-clause-shape`（自身）、`import-declaration-shape`（FromUnits/字段/Close 过滤）、
   以及被删的 `import-clause-possible-shape`（`BuildByIndex` 里 `new`）。
2. 而 `ImportClausePossibleShape.BuildByIndex` 是**唯一**会走 `ImportClauseShape` 挂载路径的入口，
   它又只被 `ImportClauseShape` 自己的 `CatalogGuide` 引用（`import-clause-shape.xl.md` 原构造器）；
   `ImportDeclarationShape` 的 `CatalogGuide` 已在 wp7c-3（`e680455b`）删除。
3. 根 `root-item-rule` 只调 `ComputeByIndex`（判据）+ `BuildByKind`（静态直接建造），**从不调**
   `CatalogGuide.Build` / `BuildByIndex`（wp7c-3 §3.1 已实测）。`SourceFileShape.CreatePossibleShapes()` 的
   13 个根候选里也没有 clause 候选。

结论：当前**唯一活的子句建造**是 `ImportDeclarationShape.FromUnits`（它直接建 `ImportClauseShape`、直接
`NamedImportsShape.FromBracket` / `NamespaceImportShape.FromTokens` / `IdentifierShape`，并自己算 Pos、SignIn/SignOut、
`TryToClose`）。所以「等价重写」的正确形式是：**删掉壳上那条已死的 CatalogGuide，而不是再实现一套壳内 bracket 接线**。
Pos 口径、`* as` 的分流、`from` 收口都留在 `FromUnits` 里，行为不变（下面 AST 硬门为证）。

## 2. 做了什么（一个代码 commit `d40832c8`）

1. **新增 `typescript/tokens/declarations/import-clause-util.xl.md`**（普通工具，不继承 PossibleShape）：
   `ImportClauseUtil.IsTypePhaseModifier(unit)` 与 `IsDeferPhaseModifier(unit)`，代码逐字节搬自
   `import-clause-possible-shape.xl.md:289-460`（含 `type from …` 的二次 lookahead、注释跳过、`defer` 同款判据）。
2. **`import-declaration-shape.xl.md`**：import 行改 `ImportClauseShape` 无关——`ImportClausePossibleShape`
   → `ImportClauseUtil`；调用点 `ImportClauseUtil.IsTypePhaseModifier(code[index])`；文档注释同步改名。
   （此时它只依赖普通 util，不再依赖任何 possible。）
3. **`import-clause-shape.xl.md`**：删 `CatalogGuide` import、删 3 个 possible import（end/named/namespace）、
   构造器只剩 `super(template);`；`Close()` 原样保留（仍把 Data 过滤成 `Name` / `NamedBindings`，并对 basic token 残留抛错）。
   文件 64 → 59 行。
4. **删除 4 个 possible 文件**（逐文件 grep 证明非注释引用 = 0 后删；删前先删 `dist/ts/**.ts` + `build/ts/**.js` 残留）：
   - `declarations/import-clause-possible-shape.xl.md`（487 行）
   - `declarations/import-clause-end-possible-shape.xl.md`（86 行）
   - `declarations/named-imports-possible-shape.xl.md`（105 行）
   - `declarations/namespace-import-possible-shape.xl.md`（157 行）
5. `named-imports-shape.xl.md` / `namespace-import-shape.xl.md` **未改**：`NamedImportsShape.FromBracket` 的第一路
   本来就是 `ClauseItemDrive.Drive`（wp7c-2 §1.1），clause 族不需要再挂接线；改了反而是无验证的 churn。

## 3. 门禁读数（commit 前实测，force 重建后）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `xl_build(core,typescript,force)` | **511 written / 0 error**（删 4 + 新增 1） | PASS |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0（gates 内 3.33s） | PASS |
| AST 子集 | `ast-json[-diff] expression statements members` | 1214/1214；0/0/0 | PASS |
| AST 全量 | `ast-json` + `ast-json-diff` | **6167/6167；结构 0 / 位置 0 / 字段 0** | PASS |
| real-dts | `real-dts-ast.mjs` | **226/226、崩溃 0** | PASS |
| item-oracle | `tests/body-drive/item-oracle.mjs` | 454 前缀全一致 | PASS |
| batch-split | `tests/body-drive/batch-split.mjs` | **70 段 / 837 断言 / 0 失败**（clause 族 6 段在内） | PASS |
| stream-proof | `tests/body-drive/stream-proof.mjs` | **146 / FAIL 0** | PASS |
| xl_check | agent `xl_check` | **511 files / 0 error / 1275 warning** | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | **RESULT: PASS**，12.6s；仅 `tests/gates/run.mjs` 基线已知红（1/8，informational） | PASS |

## 4. 收口读数（对比起点 `c46cecad`）

| 读数 | 起点 | 本分支 | 说明 |
|---|---|---|---|
| `git ls-files '*possible*.xl.md'` | 24 | **20** | 删 4（clause 族） |
| `git ls-files '*.xl.md'`（tracked） | 515 | **511** | 删 4；新增 util 未计入（commit 后 **512**） |
| `git grep -lE 'PossibleShape|ComputePossibleShapes|CatalogGuide|LegacyBatchAdapter|ShadowCompare' -- '*.xl.md'` | 61 | **56** | 删的 4 个可能 + 脱钩的 clause 壳 |
| `git grep -l 'CatalogGuide' -- '*.xl.md'` | 47 | **42** | 同上 |
| clause 4 个类名的非注释引用 | 4 | **0** | `ImportClausePossibleShape` / `ImportClauseEndPossibleShape` / `NamedImportsPossibleShape` / `NamespaceImportPossibleShape` |

`xl_orphans(prune:true)`：4 条 cache 残记（product already gone），**0 removed**——文件已在构建前手工删净，
不影响 tsc/门禁；xl_build 的 4 条 E2004 orphan 警告是这套 cache 的残影，可忽略。

## 5. 未完成项（下一棒的精确入口）

- **D-1**：根 `typescript/tokens/items/root-item-rule.xl.md` 仍是 `Guide: CatalogGuide` + 逐候选 `ComputeByIndex`；
  14 个声明级 possible 还吊在这条链上（clause 族已不在其中）。
- **D-2**：core 5 个协议文件 + `UnitToken.CatalogGuide` 字段 + `token.xl.md:128-130` 兜底 + 9 个 basic token 的
  两行 import + `BatchMode` 0/2 + `LegacyBatchAdapter` / `ShadowCompare`。
- 白名单 3 个 `class-*` possible 未动（按任务书保留）。
- `body-guide-util.xl.md` 仍在（wp7c-3 提到 C/D 组删除它，但本分支构建仍有该文件）；如需删是独立一笔。

## 6. 下一棒的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp7c-5 -From impl-wp7c-4 -Base impl-wp7c-4
cd impl-wp7c-5
# 第一步重建验证（别信本文件读数）：
#   清 dist\ build\ -> xl_build(cwd=..., paths=["core","typescript"], targets=["ts"], out="dist", force)
#   node .\node_modules\typescript\bin\tsc -p tsconfig.json
#   ..\tools\gates.ps1 -Tier standard
# 然后按 D-1 换根协议 -> xl_build -> tsc -> ast-json-diff（6167/0/0/0）-> real-dts（226）-> standard -> commit
```

## 7. 踩过的坑（本轮新增）

1. **不要为「已死的挂载路径」写重写代码**：任务书把 import-clause 当重写题是 wp7c-2 在 wp7c-3 之前的判断；
   wp7c-3 摘掉 `ImportDeclarationShape.CatalogGuide` 后，clause 的 `BuildByIndex` 已不可达。判死路径的三条命令：
   `git grep -n "ImportClauseShape" -- '*.xl.md'`、`git grep -n "ImportClausePossibleShape" -- '*.xl.md'`、
   root 里 `BuildByIndex` 的调用面。**有疑先证明路径还活着，再决定写多少代码。**
2. 删 possible 后 `xl_build` 报的 4 条 E2004 是 cache 残记；`xl_orphans` 报 "product already gone" 是正常收口，
   不要再去找文件（已删）。
3. `.xl.md` 只用 `write`/`edit` 工具（UTF-8 LF no BOM 已复核：三个改动文件 `BOM=False CR=0`）；
   不要用 PowerShell 的 `[IO.File]` + 相对路径（进程 CWD 不是 clone）。
4. `git ls-files '*.xl.md'` 不统计未跟踪的新文件：新增 util 后要报 **512**（511 tracked + 1 new），别只报 511。

## 8. 阻塞点

无。
