# HANDOFF 5d-8c：文件级 fallback 根因逐类修复（50 → 13）

分支 `feature/possible-statement-5d8c`，起点 `029aeeac`（5d-1a…5d-7 全部合并）。本轮两个 commit：

| commit | 内容 |
| --- | --- |
| 源码那次 | 源码 + 入库探针 + `docs/possible-statement-5d-plan.md §13` + 本文件；message：`fix(statements): 文件级 fallback 根因逐类修复（Stage 5d-8c）` |
| 基线那次 | **基线单独 commit**：`tests/statement-possible/legacy-baseline.json`（body 里写了前后五项） |

## 1. 结论先行

| 指标 | 起点 `029aeeac` | 终点 | 差 |
| --- | --- | --- | --- |
| `FileFallbackCount`（文件级兜底 = 整条文件 legacy 重解析） | **50** | **13** | **−37（−74%）** |
| `ScanRootCallCount`（默认解析总计） | 388 | **96** | **−292** |
| ├ 默认态（`EnableShellExpressions === true`） | 0 | **0** | 0（`root-retirement.mjs` 分桶读数） |
| └ fallback 态（`=== false`） | 388 | **96** | −292（随 fallback 条数下降） |
| `RawTailBuildCount` | 139 | **134** | −5 |
| `ShapeAstDeclinedCount` | 42 | **41** | −1 |
| `LegacyStatementDispatchCount` | 0 | **0** | 0 |
| 仍有 legacy 读数的用例 | 190 / 6300 | 153 / 6300 | −37 |
| 全门 | — | **零回归**（§5） | ✅ |

一句话：**50 条里 37 条按根因修掉（9 类），剩 13 条是 4 个明确的机制缺口，逐条列在 §4；
没有关任何开关、没有改语料/探针口径、没有让 fallback 静默，AST / XML 全部逐位一致。**

## 2. 归因方法与新增探针

`tests/statement-possible/file-fallback-attribution.mjs`（**新增，入库**）两段归因：

- **A 段**：正常解析（`EnableFileFallback = true`），挑出 `FileFallbackCount` 增量为 1 的用例
  —— 语料与 `legacy-retirement.mjs` **同源同口径**（同一套 CORPUS、同一套 ts-invalid 跳过规则）；
- **B 段**：对这些用例把 `EnableFileFallback = false` 再解析一次，让新路径的异常**直接抛出**，
  沿 `Message` / `InnerException` 取**最内层**文本（xl 的异常是普通类实例、没有 JS stack，
  所以归因依据是「谁抛的哪句话」+ 抛出点所在的 `.xl.md` 方法）。

探针自带一张**归因台账**（`EXPECTED`，4 类 13 条）：判决口径是「观测集合是台账的子集、每类不超过登记条数、
没有 crash、没有未登记类别」。所以后续阶段只要**新增**一类 fallback 或某类条数变多，探针立刻红——
它量的是**原因**，不是只看总数。当前读数：`pass（13 ≤ 13，4 类全部在台账内）`。

调查期用的临时探针（`tmp/`，未入库）也留在工作目录里便于复核：
`fallback-attrib.mjs`（逐条归因）、`shell-trace.mjs` / `build-trace.mjs`（壳收口 / 建树追踪）、
`end-trace2.mjs`（终结候选逐格读数）、`tryclose-trace.mjs`（`SourceRange` 未设置的 JS 栈）、
`ast-tree2.mjs`（TS / cj 两侧 AST 对照）、`ts-shape.mjs`（TS 对一组片段的分句结果）。

## 3. 37 条：根因分类与逐类修法

九类，全部在 `typescript/tokens/**`（没有改 `core/**`、没有改 `IsAsiBoundary` 函数体）：

| 类 | 条数 | 根因（新路径在哪一格错） | 修法（唯一实现点） |
| --- | --- | --- | --- |
| A 声明体括号闭合后**不收口** | **18** | `interface I {}` ⏎ / 同行 `function f() {}`、`enum E { A } type T = A;`、`namespace N {} class C {}`、`export interface I {} export enum E { A }`、`export default abstract class C {};`、`interface I1 { }` ⏎ `/re/g;`、块内 `{ export class A {} export const b = 1; }` —— 声明体的 `}` 已闭合，但 `;`/ASI/声明跟随三条判据都要求**换行**，于是壳把下一条语句一起吞进来，`BuildFromShell` 读到两条 → 「语句没有读完」 | `StatementBoundaryUtil.IsClosedDeclarationBody`（新）+ `IsBodyBearingDeclarationCode`（新）；`StatementEndCode` 里排在 **`;` 之前**的新分支：上一条代码单元是**已闭合的声明体括号** ⇒ 本条声明收在它身上（同行的 `;` 是独立的 EmptyStatement）。体括号判据复用 `TypeBuilder.IsBodyBrace`（`DeclarationShellEndCode` 同一份） |
| B 类型别名换行后的 `[` / `<` / `(` **不断句** | **6** | `type T = A` ⏎ `["k"];` / `<B>c;` / `(b);` —— TS 的后缀类型只在同一行吃 `[`、类型实参只在同一行吃 `<`，这三格恰好都是 `IsContinuation` 认的续接符，`IsAsiBoundary` 因此不收口、`IsDeclarationFollowBoundary` 又只认单词起点 | `StatementBoundaryUtil.IsTypeAliasLineBreakCut`（新）：段首是**类型别名**（`TypeAliasDeclarationShape.IsTypeAliasHead` 唯一实现点）+ 换行前那段能收尾（`CanEndDeclarationTail`）+ 当前是 `[`/`(`/`<` ⇒ 收在前一格。泛型函数类型的 `(` 例外（`type U = <U>` ⏎ `(a: U) => U` 是**一条**），按「RHS 以 `<` 起头」排除 |
| C 类型别名换行后的 `;` 被当成下一条语句 | 1 | `type T = A \| B` ⏎ `;`（类型尾带行注释时同样）：`BuildTypeAliasDeclaration` 的 ASI 扫描在换行处把 `;` 判成下一条语句的开头，`;` 留在壳里 → 「语句没有读完」 | `TypeAliasDeclarationPossibleShape.IsAsiBoundary`：`;` 是本条声明的终结符，**不是** ASI 边界（TS 的 `parseSemicolon` 不看换行）。状态机那一侧本来就在 ASI 判据之前有 `;` 分支，所以只影响建造器 |
| D `declare` 与后继**换行** | 1 | `declare` ⏎ `module "m" {}`：TS 的修饰词解析要求 `!hasPrecedingLineBreak()`，这一形是「ExpressionStatement(declare) + 下一条声明」；本族却在 `declare` 建壳并把两条都吞进来 | `StatementRouteUtil.DecideDeclaration`：`declare` 与并排第一个代码单元之间有行终止符 ⇒ 返回 `None`（**不建声明壳**），交回 `DecideCommon` → `declare` 是普通标识符 → 表达式壳按 ASI 收在 `declare` 上。行终止符判据读 `StatementScanner.NoLineBreakBetween`（与 `DeclareIsAmbientVariable` 同一个函数） |
| E import attributes 的 `with` 写在下一行 | 1 | `import a from "m"` ⏎ `with { type: "json" };` 是**一条** ImportDeclaration，而 `with` 是 legacy 关键字 → 字符串后面收口，拆成 ImportDeclaration + WithStatement（AST 少一个 attributes 子句） | `IsDeclarationFollowBoundary`：上一格是**模块说明符字符串**（前一代码单元是 `from` / `import`）且当前是 `with` / `assert` ⇒ 不是边界 |
| F `declare import` / `export import … from` | 3 | `declare import a from "m";` / `export declare import …` / `export import a from "m";` 在 TS 里都是**带修饰词的 ImportDeclaration**；`declare` 落 `BuildTail` → 表达式（「表达式没有读完」），`export import` 无条件进 import-equals 建造器（「import equals 声明缺少等号」） | `StatementBuilder.BuildDeclaredImportStatement`（新，与 `BuildDeclareVariableStatement` 同构）+ `BuildStatement` / `StatementFamilyDispatch.BuildDeclareFamily` 各加一条 `import` 分派；`BuildExportStatement` 的 `import` 分支按「子句里有没有 `=`」分两档（无 `=` → `BuildExportedStatement`，`export` 作为修饰词插回） |
| G 无体 ambient module | 3 | `declare module "m"` / `module "m"` 到 EOF：既没有 `;` 也没有体，`BuildModuleDeclaration` 抛「模块声明缺少模块体」 | `ModuleDeclarationShape.FromUnits`：`bodyIndex < 0 && terminatorIndex < 0` 时按「代码读完了」处理（终止单元取最后一个代码单元）；`StatementBuilder.BuildModuleDeclaration` 把切片右端收到最后一个单元 |
| H `unique symbol` / `asserts x is T` 跨行 | 3 | `declare const t: unique` ⏎ `symbol;`（类型运算符要右操作数，换行不结束类型）、`asserts x` ⏎ `is string;`（`is` 可写在下一行）：`CanEndDeclarationTail` 按**表达式**口径把 `unique` / 名字判成「能收尾」→ 声明在换行处被切早 → 「类型意外结束」/「表达式没有读完」 | `StatementBoundaryUtil.CanEndDeclarationTail`：`unique` / `readonly` / `infer` / `asserts` 在**类型位**（`StatementScanner.IsTypePositionBefore`，唯一实现点）不能收尾；`asserts` 后面的名字也不能收尾（还等着 `is`） |
| I `export default function ()` | 1 | 匿名声明的代码单元只有 `function` + `()` 两格，`FunctionDeclarationShape.FromUnits` 的「至少三格」「没有体必须带返回类型」两条判据把它判死 | 同文件：`allowAnonymous` 的调用点把下界放宽到两格、并允许「无体无分号无返回类型」的匿名恢复形（TS 给的是只有修饰词的 FunctionDeclaration） |

**共同点**：九类全部是**判界 / 分派 / 恢复形**上的缺口，没有一条靠「放宽 fallback」「改口径」消掉；
每一条都在既有唯一实现点上补判据（`IsBodyBrace` / `IsTypeAliasHead` / `IsTypePositionBefore` /
`NoLineBreakBetween` / `IsContinuation`），没有第二套 ASI、没有第二份关键字表。

## 4. 未修复 13 条：清单与原因（诚实）

| 类 | 条数 | 触发用例 | 根因（已定位到机制） | 为什么本阶段不做 |
| --- | --- | --- | --- | --- |
| 块内声明壳**晚建**时把已打开的 `{…}` 括号搬进壳 | **5** | `{ import { a } from 'm'; }`、`{ import type { A } from 'm'; }`、`{ export { a }; }`、`{ export { a } from 'm'; }`、`{ export { a }; export { b }; }`（`missing-possible.ts` L191/193/206/209/215） | 声明族的**晚建窗口**在「第二个代码单元是开括号」时建壳：`BuildByIndex` 把 `[const, {…}]` 一起搬进壳，但那个 `{` 的**闭合事件仍由原父单元驱动**，于是壳里那个括号的 `EndIndex` 永远是 `-1`，下一次空白段 `WrapSymbol.Transit` 调 `TryToClose` 抛 `SourceRange is not set`（`tryclose-trace.mjs` 的栈：`WrapSymbol.Transit → Token.TryToClose`，括号 `9..-1`）。同一机制也打中 `{ const {a} = o; }`（**不在**本语料里，但同样红） | 修法要改「晚建窗口 vs 括号挂载」的**时序**：要么在第二个单元是开括号时推迟建壳（等括号闭合后的下一格），要么让被搬走的开括号改由壳驱动。前者要改 `IsBuildable` / `ComputeByIndex` 的窗口定义（`ControlFlowStatementPossibleShape`，最热的候选路径），后者要动 `MountedUnit` / 驱动栈。两者都是「一改就波及每一个含 `{` 的晚建声明」，需要单独一轮全门 + 反事实；本轮预算在第 7 轮按纪律收尾 |
| 函数 / 构造签名的**返回类型字面量** | **4** | `type T = (a: A) => { b: B }`、`type T = new () => { a: A }`、`declare function f(): (a: A) => { b: B }`、`type T = new <A>(a: A) => { b: A }`（`type-fn-return-typeliteral.ts`、`gap-r1244-…`、`dts-types.ts` L68、`types.ts` L430） | `=>` 后面那个 `{` 在**语句层先被当成块语句建掉**（壳里出现 `LabeledStatement`），类型别名建造器随后拿到的是坏切片 → `TypeBuilder.ParseTypeMember` 报「不支持的对象类型成员」 | 这是**类型字面量 vs 块**的归属竞争：要么在 `BlockPossibleShape` / 语句候选的起点判据里认「`=>` 之后是类型位」，要么让类型别名候选先于块壳接管。前者要改 token 层的类型位判据（影响每个 `=>`），后者要改候选优先级（影响每个以 `{` 开头的语句）。两者都会波及 `class` / 函数体 / 对象字面量的既有分岔，属于类型层与语句层的交界，单独一轮才安全 |
| `type` + CR / U+2028 / U+2029 | **3** | `type\rT = 1`、`type\u2028T = 1`、`type\u2029T = 1`（`possible-compute.ts` L331–333） | `type` 与名字之间有行终止符 ⇒ `type` 是标识符、TS 给两条 ExpressionStatement；本实现的**根终结候选与声明候选在同一格同时 Accept**（`CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 2）`）。声明候选那一侧的同名判据（`HasLineBreakBetween`）在**名字阶段**已经会 Reject，所以同时 Accept 的是**另一条**根候选（`SourceFileEndPossibleShape` 的收口） | 需要把「根终结候选在文件还有内容时不得 Accept」这一条收口判据与「声明候选已 Reject」对齐——改动点落在根终结候选的 `ComputeByIndex`（`source-file-end-possible-shape`），它同时承担 EOF 兜底与根层收口，回归面覆盖全部 6300 用例；本轮预算不允许再开一轮全门 |
| 前缀 `--` / `++` / `!` 换行接操作数 | **1** | `a++; --` ⏎ `a;`（`prefix-operand-newline.ts` 八格里的第一格；其余七格本来就对） | 前缀运算符的操作数可以写在下一行（TS 不在 `--` 前面断句），但**表达式壳在 `--` 处收口**，随后 `a` 成为一条独立语句 → 「表达式意外结束」 | 需要同时看两处：壳的收口判据（`StatementBoundaryUtil` 对前缀运算符的处理）与 `ExpressionBuilder` 的前缀读取（它必须允许跨行取操作数）。只改一处会出现「壳收口了但建造器读不完」或反之，属于表达式层与判界层的交界 |

**没有一条是「TS 非法恢复形」之外的借口**：上表四类的机制都已用 `tmp/` 探针定位到具体方法 + 具体分支，
只是修法都在「改一处、波及全身」的判据上，按 9 轮预算的纪律留到下一阶段（每类都写清了入口方法）。

## 5. 默认全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 **0** / 位置差 **0** / 字段差 **0**；`git status --porcelain typescript/cases` 空 |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0**，ts-invalid=10，known-gap=0 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** |
| `tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38，knownGap=1 是既有的 `clause-nested-known-gap`） |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** |
| `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46** |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**，knownGap=1（既有） |
| `tests/statement-possible/root-retirement.mjs` | **PASS**（默认态 `ScanRoot=0`；false 态仍工作；fallback 语料 13） |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已更新为 0 / 96 / 134 / 41 / 41 / 13） |
| `tests/statement-possible/file-fallback-attribution.mjs`（新） | **PASS**（13 条、4 类，全部在台账内，0 新类别） |

`ast-json` / `ast-json-diff` 的 `.cj-ast.json` 快照在测完之后 `git checkout -- typescript/cases`，
工作树只剩 §6 的源码 / 探针 / 基线 / 文档。

## 6. 改动的文件

源码（全部在 `typescript/tokens/**`）：

| 文件 | 改动 |
| --- | --- |
| `statements/statement-boundary-util.xl.md` | 新增 `IsBodyBearingDeclarationCode` / `IsClosedDeclarationBody` / `IsTypeAliasLineBreakCut`；`StatementEndCode` 两条新分支；`IsDeclarationFollowBoundary` 的 import attributes 判据；`CanEndDeclarationTail` 的类型位 / `asserts` 判据 |
| `statements/statement-route-util.xl.md` | `DecideDeclaration`：`declare` + 换行 ⇒ `None` |
| `statements/statement-builder.xl.md` | 新增 `BuildDeclaredImportStatement`；`BuildStatement` 的 `declare` 分支加 `import` 分派；`BuildExportStatement` 的 `import` 分档；`BuildModuleDeclaration` 的 EOF 无体分支 |
| `statements/statement-family-dispatch.xl.md` | `BuildDeclareFamily` 加 `import` 分派 |
| `declarations/module-declaration-shape.xl.md` | 无体 ambient module 的 EOF 恢复形 |
| `declarations/function-declaration-shape.xl.md` | 匿名恢复形（`export default function ()`）的两条下界 |
| `declarations/type-alias-declaration-possible-shape.xl.md` | `IsAsiBoundary` 排除 `;` |

探针 / 文档：`tests/statement-possible/file-fallback-attribution.mjs`（新）、
`tests/statement-possible/legacy-baseline.json`（基线 commit）、`docs/possible-statement-5d-plan.md §13`、本文件。

**没有改**：`core/**`、`IsAsiBoundary` 函数体语义、任何开关默认值、`dist/` `build/`、语料。

## 7. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d8c

# 生成 + 编译（改了 .xl.md 之后必须按这个顺序；xl_build 用工具，cwd=本目录）
#   xl_build: paths=["typescript/tokens/statements","typescript/tokens/declarations"], targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json      # 必须 exit 0 再跑测试

# 指标
node tests/statement-possible/legacy-retirement.mjs            # 与基线比对 → PASS（0 / 96 / 134 / 41 / 41 / 13）
node tests/statement-possible/legacy-retirement.mjs --quiet    # 只看总计
node tests/statement-possible/legacy-retirement.mjs --snippets # 42 条逐构造
node tests/statement-possible/root-retirement.mjs              # 默认态 ScanRoot 0 / false 态仍工作
node tests/statement-possible/file-fallback-attribution.mjs    # 13 条 fallback 逐类归因（新）

# 全门（§5 的读数就是按这个顺序跑出来的）
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs ; git checkout -- typescript/cases
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/parse/validate.mjs
node tests/statement-possible/final-matrix.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/op-proof.mjs
node tests/statement-possible/ast-kind-names.mjs
node tests/statement-possible/short-family-boundary.mjs
node tests/statement-possible/control-flow-boundary.mjs

# 调查探针（tmp，未入库；先 build + tsc）
node tmp/fallback-attrib.mjs             # 逐条归因（--json）
node tmp/shell-trace.mjs <cases.json>    # 失败语句壳的 consumed 片段
node tmp/build-trace.mjs x <cases.json>  # 每个壳的建壳 / 收口 / 抛错
node tmp/end-trace2.mjs "<源码>"         # 终结候选逐格读数（end / Accept）
node tmp/tryclose-trace.mjs <cases.json> # SourceRange 未设置的 JS 栈
node tmp/ast-tree2.mjs "<源码>"          # TS / cj 两侧 AST 对照
node tmp/ts-shape.mjs                    # TS 对一组片段的分句结果（设计判据用）

# 回退
git revert --no-edit <基线 commit>   # 先撤基线（否则指标与源码不一致）
git revert --no-edit <源码 commit>   # 再撤源码
# 或整体：git reset --hard 029aeeac（会丢掉两个 commit，谨慎）
```

**最小安全点**：`EnableShellExpressions = false`（`--legacy-only` 或 harness 的 legacy 档）仍然是
「5d-8c 之前」的行为——本轮没有碰 false 态的候选目录（`root-retirement.mjs` 的 C 段逐条核过）。
