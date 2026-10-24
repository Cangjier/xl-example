# HANDOFF — impl-wp6（WP-6：module / switch / try + import-export clause）

STATUS: PARTIAL
BRANCH: impl-wp6 @ 62c9d35b
BASE: refactor-integration @ aeb2cbd7

> **一句话**：本包对 WP-3 的**关键交付已完成并全绿**——module / import / export 全形态的
> 「直接建造入口」（不依赖 `BuildByIndex`/`MountShell`、不改 `host.Data`）+ 模块体 item 表的
> 规则/宿主/一成员建造入口；`AST 6167 0/0/0`、`real-dts 226/226`、`full -BaseBuild` PASS。
> **未完成**：module body / case block / try 三块 / clause 表的**接线**（接线点不在本包写范围内，
> 见 §未完成项，逐条给了缺哪个文件的哪个钩子）。

## 做了什么

### 1. 新增 `typescript/tokens/items/module-item-rule.xl.md`
- `DeclarationSpan`（静态工具，所有直接建造入口共用）：
  `Slice(host, start, end)`（`[start,end)` 非 trivia 单元）、`PosBefore(host, start)`（TS `node.pos` 口径）、
  `Positions(code, base)`（与 `StatementBuilder.Load`/`ExpressionBuilder.Load` 逐字同口径）、
  `EndsWithSemicolon(code)`。**只读宿主，从不改写 `host.Data`**。
- `interface ModuleMemberBuild { BuildAt(host, start, end, context): Token | null }`：
  一成员建造器接口，用来**避免 items ↔ 形状的循环依赖**。
- `class ModuleItemRule implements ItemRule`：模块体 item = 一个成员。
  `Classify`（空/trivia/`;` 不认领）、`Extend`（无族内状态，成员体都是已闭合括号单元）、
  `Analyze`（三条收口证据：显式 `;` / 换行处的下一个成员首词（`IsMemberStartWord`+`NoLineBreakBetween`）/
  已闭合的 `{ … }` 体括号）、`Build`（委托注入的 `MemberBuilder`，不复制成员分派）、`IncludesSeparator()=true`。
- `class ModuleBodyItemHost implements IBatchHost`（`ItemListEngine(ModuleItemRule)` 的宿主，
  `BatchPolicy`：`;` / `}` / MaxTokens=8 / EOF）。**本阶段未接线**（见 §未完成项 1）。

### 2. 直接建造入口（**本包对 WP-3 的关键交付**，全部新增，不动既有路径）
逐条签名（`end` 一律是**半开**区间终点，`host` 可以是 `SourceFileShape` / `Bracket` / 任意已闭合形状）：

| 形态 | 入口 | 语义要点 |
|---|---|---|
| import 声明 | `ImportDeclarationShape.BuildDirect(host, start, end, context): ImportDeclarationShape \| null` | `import a from "m"` / 具名 / 命名空间 / 副作用 / `import type` / **`import defer`** / `with`·`assert` attributes；`;` **可有可无**（ASI） |
| import 声明（腿） | `ImportDeclarationShape.FromCode(template, code, pos, context, hasSemicolon): ImportDeclarationShape` | 缺失的 `;` 只在**局部数组**里合成零宽 `;`（`AppendValueAndSignOut` 签出到 `lastEnd`），不动 `host.Data` |
| export 声明 | `ExportDeclarationShape.BuildDirect(host, start, end, context): ExportDeclarationShape \| null` | `export { … }` / `export * from` / `export type { … }` / `from("m")` 括号化恢复形 / attributes；`;` 可有可无。`export =` / `export default` / `export import` / `export as namespace` 明确返回 `null`（各有专属入口） |
| export 声明（腿） | `ExportDeclarationShape.FromCode(template, code, pos, context, hasSemicolon)` | 同上 |
| import-equals | `ImportEqualsDeclarationShape.BuildDirect(host, start, end, context): ImportEqualsDeclarationShape \| null` | `import x = require("m")` / `import x = A.B.C` / `export import x = …` / `import type x = …`；**`;` 口径：可有可无**（`FromUnits` 的区间终点本来就是一个 `last` 单元，带 `;` 落 `;`、ASI 落引用末单元，**不需要合成 `;`**） |
| export-assignment | `ExportAssignmentShape.BuildDirect(host, start, end, context): ExportAssignmentShape \| null` | `export = <expr>` 与 `export default <expr>`；**ASI**：`hasSemicolon=false` → `End` 取表达式末尾（`;` 不是本节点 children）；`export default class/function/interface/enum/abstract/async` 返回 `null`（那是声明族） |
| export as namespace | `NamespaceExportDeclarationShape.BuildDirect(host, start, end, context): NamespaceExportDeclarationShape \| null` | `export as namespace X`；**`;` 口径：可有可无**（模块体里换行收口的同一口径，但不合成 `;`）；`FromUnits` 新增 `requireSemicolon?:bool` |
| 模块声明 | `ModuleDeclarationShape.BuildDirect(host, start, end, context): ModuleDeclarationShape \| null` | `namespace N { … }` / `module N { … }` / `declare module "m" { … }` / `declare global { … }` / 无体 `declare module "m";`。**`declare module` 的 End 重锚**：带体取 `}` 括号 `End`，无体取 `;` 或（ASI）名字单元 `End`，都不看尾随 trivia；`FromUnits` 新增 `requireTerminator?:bool` |

返回值契约统一：`null` = 这一片不是这种形态（或不是完整声明）→ 调用方走 raw 兜底；**不抛异常、不读宿主以外状态**。
`BuildDirect` 全部是 `try { … } catch { return null; }`，所以「判型与建造冲突」按 INV-7 落到 raw。

### 3. 模块体一成员建造入口（为将来接线准备好）
- `ModuleBlockShape.BuildMemberAt(block, bracket, dataStart, context): Token | null`：
  从 `bracket.Data[dataStart]` 起建**恰好一个**成员并返回、不留进 block（复用 `BuildMember` 的现成分派，
  判据一个字没复制）；`block` 必须是同一模块体的 block 实例（`DataCursorAt` 游标要跨成员前进）。
- `ModuleBlockShape.CreateBodyItemRules(): Array<ItemRule>`：`[ModuleItemRule]`，`MemberBuilder` 注入
  `ModuleBlockMemberBuild`（按括号缓存 block）。**本阶段未接线**（见 §未完成项 1）。

### 4. `tests/body-drive/batch-split.mjs` 新增 `module` 族
- 捕获真实模块体括号（打桩 `ModuleBlockShape.FromBracket`），每次跑克隆一个新 `Bracket`（Data 副本）；
  整批 vs 在 1 / n/2 / n-1 处切两批，`ModuleBodyItemHost` 建出的 item 序列（构造器名 + XML）必须一致。
- 读数：`== family module: 5 段代码 ==` / 建出 item 4、全 raw 1 / **58 次断言 0 失败 → PASS**。

## 门禁读数（本分支实测，dist/build 均为本分支构建）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| B | `xl_build(core,typescript→dist)` + `tsc -p tsconfig.json` | 875/876 files、**0 error**、2417 warning；tsc exit 0 | PASS |
| AST | `node typescript/cases/ast-json.mjs` / `ast-json-diff.mjs` | **6167/6167**；结构 0 / 位置 0 / 字段 0 | PASS |
| RD | `node typescript/cases/real-dts-ast.mjs` | **226/226**，崩溃 0，差异 0 | PASS |
| BD | `node tests/body-guide/harness.mjs --target=all --all` | interface 35/35、enum 46/46、class 54/54、util 10/10 | PASS |
| ORACLE | `node tests/body-drive/item-oracle.mjs` | 88 段 / 450 前缀，逐前缀 Status/End 一致 | PASS |
| SPLIT | `node tests/body-drive/batch-split.mjs --family statement` / `--family module` | statement 19 段 170 断言 PASS；module 5 段 58 断言 PASS | PASS |
| BUF | `gates -Tier full -BaseBuild ..\baseline-build\build` 内 | xml **PASS 4504 / FAIL 0** / 同错 52；digest 同（token 797790 = 基线） | PASS |
| F | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: PASS**（44.7 s；唯一 RED* 是 KNOWN-RED `tests/gates/run.mjs` 1/8） | PASS |
| XLC | `xl_check(paths=[core,typescript], ignore W3102/W3103)` | **0 error**，1 warning（`E1107` 撞名，既有：`import-attributes-possible-shape` 在 declarations/ 与 members/ 各有一份） | PASS |
| PERF | `node tests/bench/parse-perf.mjs --dts 8 --repeat 3` | **TOTAL median 529.193 ms**（基线 538，门限 565） | PASS |
| PERF-single | `typescript.d.ts` 单文件、5 次取中位（同轮配对） | 本分支 **102.8 ms** / baseline-build **97.3 ms**（样本 95.2–115.3 / 82.7–115.1，**区间重叠**；总 Parse 反而更好） | 记录（±5% 噪声内，未见真实劣化：新代码全是不进热路径的静态方法） |
| CLS | `class-scaling --rounds 15` + `--base` | 12 档 PASS；T=2000 median 8.40（x2.00）；XML 21/21 等价 | PASS |

## 仍被 root 引用、本包**故意没删**的 possible 文件（WP-3/WP-7 之后再删）

集成分支的 root 仍是 legacy `SourceFileShape.CreatePossibleShapes()`（`typescript/tokens/files/source-file-shape.xl.md`）
+ `source-file-end-possible-shape.xl.md`，它们仍 import 下列**声明级/语句级候选**；删任何一个都会打断 root AST：

- `typescript/tokens/declarations/`：`import-declaration-possible-shape.xl.md`、`import-equals-declaration-possible-shape.xl.md`、
  `import-declaration-end-possible-shape.xl.md`、`import-clause-possible-shape.xl.md`、`import-clause-end-possible-shape.xl.md`、
  `import-attributes-possible-shape.xl.md`、`named-imports-possible-shape.xl.md`、`namespace-import-possible-shape.xl.md`、
  `import-specifier-possible-shape.xl.md`、`export-declaration-possible-shape.xl.md`、`export-declaration-end-possible-shape.xl.md`、
  `named-exports-possible-shape.xl.md`、`namespace-export-possible-shape.xl.md`、`export-specifier-possible-shape.xl.md`、
  `export-assignment-possible-shape.xl.md`、`external-module-reference-possible-shape.xl.md`、
  `module-declaration-possible-shape.xl.md`、`module-block-possible-shape.xl.md`、
  `namespace-export-declaration-possible-shape.xl.md`
- `typescript/tokens/statements/`：`switch-statement-possible-shape.xl.md`、`try-statement-possible-shape.xl.md`

（各自形状的 `constructor` 里 `CatalogGuide = new CatalogGuide(CreatePossibleShapes(), new XxxEndPossibleShape())`
还是硬引用，WP-7 要连 `CatalogGuide` 字段一起拆。）
**唯一可以现在就删的**：`typescript/tokens/declarations/case-block-possible-shape.xl.md`（`CaseBlockPossibleShape` 的外部引用 = 0，
是纯 throw 桩）。本包没删它，因为 case block 本身没迁移（见下）。

## 未完成项（精确到文件 + 缺哪个钩子）

1. **module body 没有真正挂上 `ItemListEngine(ModuleItemRule)`**。
   缺的钩子：模块体括号的**创建点**。今天 `ModuleDeclarationPossibleShape.BuildByIndex` 一次性调
   `ModuleDeclarationShape.FromUnits(code, positions, ctx)`，体括号是 `ModuleBlockShape.FromBracket` 从**已闭合**的
   括号建的——没有「括号刚创建、壳已挂载」的时刻可以设 `body.BatchAdapter = new ModuleBodyItemHost(...)`。
   需要的改动（不在 WP-6 写范围）：`module-declaration-possible-shape.xl.md` 里在 `{` 创建时先把
   `ModuleDeclarationShape` 壳挂上（照 `interface-declaration-shape.OnBracketCreatedEvent` 的样板），
   收口时 `OnBasicTokenClosed → FinishBody → body.FlushBatch → ModuleBlockShape.FromBracket(收集已建成员)`。
   已备好的一半：`ModuleItemRule` / `ModuleBodyItemHost` / `ModuleBlockShape.CreateBodyItemRules` / `BuildMemberAt`。
   接线后必须重跑：`batch-split --family module`、AST 全量、real-dts、buffer 等价（模块体是 `typescript.d.ts` 主战场）。
2. **case block 没有挂 `CaseClauses` 表**。缺的钩子：`StatementBuilder.BuildSwitch`（`typescript/tokens/statements/statement-builder.xl.md`
   约 L2157/L2166）在**语句建完才**造 `SwitchStatementShape` / `CaseBlockShape`，此刻 switch 体括号早已闭合且
   在语句的 `Units` 里，没有创建钩子。`statement-builder.xl.md` 不在 WP-6 写范围（PLAN §6.2 把 `statements/**` 给了 WP-2）。
   需要的改动：switch 关键字处先挂 switch 壳（或给 `Bracket` 加「创建时回调宿主」），再让 case block 括号挂
   `ItemListEngine(CaseClauseItemRule)`。`case-block-shape.xl.md` 现在只有一个 `constructor`。
3. **try 的三个块（try/catch/finally）没有各自挂 `Statements` 表**。同一个原因：`StatementBuilder.BuildTry`
   （约 L2254）在建完时才造 `TryStatementShape`，三个体括号都是已闭合单元。缺的同样是「括号创建钩子」。
   复用 `StatementItemRule` 本身不需要新代码（`StatementBodyItemHost` 已在）。
4. **import/export clause 小表没做**。缺的钩子：`NamedImportsShape.FromBracket(bracket, ctx)` /
   `NamedExportsShape.FromBracket(bracket, ctx)`（`named-imports-shape.xl.md` / `named-exports-shape.xl.md`）
   都在**已闭合**的 `{ … }` 上一次性建 specifier 列表；这两个文件不在 WP-6 写范围（PLAN §6.2 只给了
   `import-*` / `export-*`，而 `named-*` 不匹配）。需要的改动：`ImportClauseShape`（在范围内，`import-clause-shape.xl.md`）
   在 `{` 创建时挂 `ItemListEngine(ClauseItemRule)`，收口时把已建 specifier 收进 `Elements`。
   `clause-item-rule.xl.md` **没有创建**（没有接线点的话它只能是被单测驱动的死代码；如果 WP-6 接力只做这一项，
   建议先做 §未完成项 1 的括号钩子，再照同样的形状加 clause 表）。
5. `typescript.d.ts` 单文件计时比基线高 5.7%（噪声区间内，总 Parse 529 < 538）。接力时若要收紧，
   先确认没有把 `DeclarationSpan` 的循环带进热路径（目前 `BuildDirect` 无调用者，不进解析路径）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp6-2 -From impl-wp6 -Base impl-wp6
cd impl-wp6-2
# 先读本条 HANDOFF 的「未完成项 1」；改 module-declaration-possible-shape（或 module-declaration-shape 的挂载点）
#   → xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
#   → node .\node_modules\typescript\bin\tsc -p tsconfig.json
#   → node .\tests\body-drive\batch-split.mjs --family module   （注意：是空格，不是 --family=module）
#   → node .\typescript\cases\real-dts-ast.mjs；node .\typescript\cases\ast-json-diff.mjs
#   → ..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build
#   → git checkout -- typescript/cases && git commit
```

## 阻塞点

- 无环境阻塞。xl_build / tsc / gates / baseline-build 全部可用。
- 功能性阻塞只有一条：**模块体 / case / try / clause 的括号创建钩子不在 WP-6 写范围内**（见 §未完成项 1–4）。
  WP-3 的 `SourceFileTailBuilder` 与 WP-7 的候选退役会把 `module-declaration-possible-shape` /
  `named-*-shape` / `statement-builder` 打开，那时接线是一轮左右的事，一半代码本包已经备好。

## 踩过的坑

- **`Array<int>` 不能写在局部变量注解里**：xl 只在签名类型上把 `int` 映射成 `number`；
  `const positions:Array<int> = []` 会生成字面 `Array<int>`，`tsc` 报 `TS2304: Cannot find name 'int'`。
  局部一律写 `Array<number>`。
- `xl_build` 每次都会把 2417 条 `W3102/W3103` 全打出来（约 370 KB）：调它一次就够，别在每轮里反复调；
  只想看错误就用 `xl_check(ignore:["W3102","W3103"])`（0 error / 1 warning）。
- `tests/body-drive/batch-split.mjs` 的族参数是 **`--family module`（空格）**，`--family=module` 会被判「未知参数」。
- `ast-json.mjs` / `ast-json-diff.mjs` 会重写 `typescript/cases/*.cj-ast.json`：跑完记得
  `git checkout -- typescript/cases`（本提交已还原）。
- 直接建造入口全部用「局部数组 + `hostLike = { Data, Template }`」喂既有 `FromUnits`，
  是仓库里已有的手法（`StatementBuilder.BuildImportStatement` 同一套）；**不要**去改 `FromUnits` 的区间口径，
  它的 `[start,end]`（含 `end`）与引擎的 `[Start, End+1)` 刚好对齐。
