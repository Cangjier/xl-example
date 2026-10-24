# HANDOFF — impl-wp7c-2（WP-7 C/D 组第二波）

STATUS: **PARTIAL** —— 0 处源码改动；本轮交付的是「3 个壳的可执行切法 + 对任务书前提的两处纠正 + 顺序重排」
BRANCH: `impl-wp7c-2`
BASE: `impl-wp7c-1 @ 153e0ff7`（= `84bb69df` C-1a + 一份 HANDOFF doc，等价于 `84bb69df`）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7c-2`
未 merge、未 push。**本分支代码状态与 `impl-wp7c-1 @ 153e0ff7` 逐字节相同**（只多本文件）。

## 0. 本轮到哪一步为止（诚实账）

做完了：读 `TEAM.md` §5、`HANDOFF.wp7c-1.md`、`spec-deletion` D 组；通读 3 个待切壳 + 3 个 possible +
`clause-item-rule` + `token`/`unit-token`/`bracket` 的分发链。

没做：任何源码改动、任何构建、任何门禁。**10 轮预算在「读懂分发链」阶段耗尽**（这条链必须先读懂，
盲改会毁掉 AST 6167 且没有验证轮可退）。

基线读数**沿用** `HANDOFF.wp7c-1.md` §2（`84bb69df` 实测：standard PASS / AST 6167-0-0-0 / real-dts 226），
本分支相对它只多一个 docs commit，因此基线应当仍绿 —— 但**下一棒第一步必须自己重建验证一次**
（清 `dist`/`build` → `xl_build(force)` → `tsc` → `gates -Tier standard`），不要信本文件的读数。

## 1. 决定性发现（纠正任务书前提，省下一棒一整轮）

### 1.1 `import-clause` 的子句 item 表**已经接进 legacy 路径了**

`typescript/tokens/declarations/named-imports-shape.xl.md:30-42`：
`NamedImportsShape.FromBracket` 的**第一路**就是

```ts
const built = ClauseItemDrive.Drive(bracket, context, new ImportSpecifierClauseBuild(bracket));
```

只有它返回 `null` 才退回旧的「按 `,` 分组」循环。

→ 所以 `import-clause-shape` 上的 `CatalogGuide` **只负责「判何时调 FromBracket」**，specifier 的建造本身
早已是 item 驱动。任务书说的「挂 `ClauseItemHost`」需要修正口径：**不是再挂一个 host**
（`ClauseItemHost` 已经在 `ClauseItemDrive.Drive` 内部被 new，见 `items/clause-item-rule.xl.md:304`），
而是要**把判据侧的 `CatalogGuide` 拆掉、由壳自己判**。想「参考 named-imports 的 FromBracket 接线」的话，
接线已经存在，要动的是壳。

### 1.2 三个 possible 各自的行为（切壳时必须逐条等价重写）

| possible | 判据 | 建造 | 重写要点 |
|---|---|---|---|
| `named-imports-possible-shape` | Data 里最后非 trivia 是 `{` 开头 `Bracket` → `Accept`；已是 `NamedImportsShape` → `Reject`；尾是 `,` → `Uncertain` | `NamedImportsShape.FromBracket(bracket, context)`；`Pos = 前一个非 trivia 单元的 SourceRange.EndIndex`，没有则 `bracket.SourceRange.StartIndex`；`host.Data.splice(index, 1, shape)`；`shape.Parent = host` | `Pos` 口径最容易错：它是 `{` **外面**那一格（默认导入后的逗号）的 End |
| `namespace-import-possible-shape` | 扫出 `*` → `state.Star`；`* as` 后跟标识符 → `Accept`；尾是 `from` → `Reject`；无 `*` 且尾是 `,` → `Uncertain`；有 `IsBuildable` 门（`* as` 已到、名字未到 → 不建） | `NamespaceImportShape.FromTokens(Data.slice(star, tokenIndex+1), context)`；`Pos = star 前一个非 trivia 的 EndIndex`；`splice(star, n, shape)` | `IsBuildable` 必须一起搬，否则会建出残缺的命名空间导入 |
| `import-clause-end-possible-shape` | 尾是 `from` → `Accept` | **不是建造，是收口**：`ReloadMessage.FromRange(host, from.Start, from.End)` 入 `context.Messages` → `SignOut(最后一个非 trivia 的 End)` → `TryToClose(context)` → `Quit()` → `(Parent as any).MountedUnit = null` | 三段顺序不能变；这是壳的生命周期终点 |

### 1.3 现成的移植物：enum/class 体已经这么干了

- `core/syntax/basic-tokens/bracket.xl.md:141`：「**通知父单元 `OnBracketCreatedEvent`**：父单元可能借这个时机
  给新括号挂上目录向导（**接口体的成员候选就是这么接上的**）」
- `bracket.xl.md:164-165`：`if ("OnBracketCreatedEvent" in unit) { (unit as ...).OnBracketCreatedEvent(mounted, context); }`
  —— 父单元没这个成员就**不通知，也不再往上找**
- `typescript/tokens/declarations/enum-declaration-shape.xl.md:56`：「枚举体括号创建时 `OnBracketCreatedEvent`
  认领它、**给括号挂上 item 表引擎**」

→ `import-clause-shape` 直接抄这个形状：在 `OnChildCreated` / `OnBracketCreatedEvent` 里认领 `{`，
括号闭合后调 `NamedImportsShape.FromBracket` 并把结果 splice 进自己的 `Data`；`* as` 用「最后一个 code 单元」
判；`from` 用 1.2 表里那段收口。**这就是 enum 体已经验证过的同一套做法**，不是新发明一套。

名字桥（都是现成的，不用改）：`unit-token.xl.md:207-210`（`OnChildCreated` 默认转调 `OnBracketCreatedEvent`）、
`batch/i-batch-host.xl.md:31`、`batch/legacy-batch-adapter.xl.md:59,66-68`。

## 2. 建议顺序（**按证据重排**，与任务书相反）

任务书写「import-clause 先做」。证据说 **import/export-declaration 先做更安全**：

- `import-declaration-shape.xl.md:410`、`export-declaration-shape.xl.md:351` 各有一行注释：
  「不依赖 `BuildByIndex` / `MountShell` / `CatalogGuide`」
  → **直接 builder 已经在文件里了**。切这两个壳是「删掉 constructor 里的 CatalogGuide 行 + 删
  `new XxxEndPossibleShape()` 的 mount + 改走已有的直接路径」，是**接线题**。
- `import-clause` 要等价重写 1.2 表里三个行为，是**重写题**，风险高一个量级，不该第一个做。

建议：① `export-declaration` → ② `import-declaration` → ③ `import-clause` → ④ D-1 → ⑤ D-2。
（②③ 会连带 `import-clause-possible` / `named-*` / `namespace-*` / `string-literal-possible` 的引用面，
一次只动一个壳，别合并。）

### 2.1 每壳一个 commit，每壳必跑

```
清 dist/ts 与 build/ts 中该壳产物
→ xl_build(force) → tsc（exit 0）
→ ast-json + ast-json-diff               （6167/6167，结构 0 / 位置 0 / 字段 0）
→ real-dts-ast                            （226/226，崩溃 0）
→ item-oracle / batch-split / stream-proof
→ ..\tools\gates.ps1 -Tier standard       （PASS）
全绿才 commit。
```

`batch-split --family clause` 只有做到 ③ 才有意义；①② 用全量 `batch-split`。

## 3. 剩余 30 个 possible 的账（C-1a 后读数，未变）

| 数 | 内容 | 前置 |
|---|---|---|
| 14 | 声明级：class / enum / interface / function / type-alias / module / import-* / export-* / named-* / namespace-* / import-attributes | **D-1 协议重塑**（见下） |
| 3 | 白名单保留：`expressions/class-expression`、`jsdoc/jsdoc-class-tag`、`keywords/class-keyword` | 不删 |
| 2 | `statements/statement-possible`、`expression-statement-possible`（`StatementScanner/Builder` 的判据主体，`IsAsiBoundary` 等在用） | 不删 |
| 1 | `literals/string-literal-possible`（被 import/export 壳 import） | 随 ②③ |
| 5 | core：`catalog-guide` / `possible-shape` / `possible-shape-cache` / `i-compute-possible-shapes` / `compute-possible-shapes-states` | D-2 |
| 3 | 3 个壳的 `*-end` / `named-*` / `namespace-*` | 随 ①②③ |

（表内合计 > 30 是因为 3 个壳的 possible 与「14」有重叠计数；实际以 `git ls-files '*possible*.xl.md' | wc -l` = 30 为准。）

## 4. D-1 / D-2（不变，见 `HANDOFF.wp7c-1.md` §3.1 / §4-3 / §4-4）

- 根 `items/root-item-rule.xl.md`（1173 行）仍是 `Guide: CatalogGuide` + 逐
  `PossibleShape.ComputeByIndex/BuildByIndex`，靠 `SourceFileShape.CreatePossibleShapes()` 喂候选。
  **要删 14 个声明级，必须先换协议**：`items/` 里立 `IRootItemRule { Accept / Rules / Build }`（不含 possible 语义），
  把 14 类搬成直接规则类，优先复用各自已有的 `XxxShape.BuildDirect` / `FromUnits` 与 `BuildByKind` 的 12 类分派，
  **解析结果不得变**；换完才删这些 possible 文件。
- 换完才动 core 5 + `UnitToken.CatalogGuide` 字段 + `token.xl.md:128-130` 兜底 + 9 个 basic token 的两行 import +
  `BatchMode` 0/2 分支 + `LegacyBatchAdapter` / `ShadowCompare`。
- 收口 grep 目标（当前 67 个文件命中）：
  `git grep -nE 'PossibleShape|ComputePossibleShapes|CatalogGuide|LegacyBatchAdapter|ShadowCompare' -- '*.xl.md'` = 0。

## 5. 踩坑（继承前两棒，逐条仍有效）

1. **PowerShell 写 `*.xl.md` 会带 CRLF → xl_build E1006**。用 `edit` / `write` 工具（按原样字节），
   或 `$t = $t -replace "\r\n","\n"; [IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding($false)))`。
2. `xl_build(force)` **不删**已删源文件的产物 → 先手删 `dist/ts/**`、`build/ts/**` 同名 `.ts/.js`，否则 tsc 编译旧文件 = 假绿。
   删后 xl_build 报的 E2004 orphan 只是 cache 残记，`xl_orphans(prune:true)` 可清。
3. `xl_build` 输出约 18 万字节：一条 pwsh 里只 `Select-Object -Last N` 看尾部。
4. 判死引用要**按类名 + 排除注释行**：`git grep -n 'XxxPossibleShape' -- '*.xl.md' | Where-Object { $_ -notmatch ':\s*//' }`。
   直接 grep `PossibleShape` 会把「只 import 不用」和注释一起算。
5. 回滚：`git checkout -- <paths>` 之后**必须重跑 xl_build + tsc** 再看 diff；`typescript/cases` 被 checkout 后必须重跑 ast-json。
6. 全量 AST 是硬门槛：任何一批改动只要不是 6167/6167 + 0/0/0，就当失败回滚，不要往下叠加。

## 6. 交接口径

- 本分支可直接当下一棒的 base（与 `impl-wp7c-1 @ 153e0ff7` 代码等价），也可丢弃。
- 建议下一棒：`impl-wp7c-3`，`-From impl-wp7c-2 -Base impl-wp7c-2`。
- 下一棒**第一件事**：`xl_build` → `tsc` → `gates -Tier standard`，确认绿了再动第 ① 个壳（export-declaration）。
