# HANDOFF 5d-8a：体内 raw 尾巴收尾（块内声明族路由 + 体挂载）

分支 `feature/possible-statement-5d8a`，起点 `029aeeac`（LegacyDispatch 0 / 默认 ScanRoot 0 / RawTail 139 /
Declined 42 / FileFallback 50），工作树干净。本轮两个 commit：

| commit | 内容 |
| --- | --- |
| 源码 + 探针 | 6 个 `.xl.md`（3 个 statements 族码文件 + 3 个候选 / 判据文件）、2 个探针预期、`docs/possible-statement-5d-plan.md §13`、本文件 |
| **基线单独 commit** | `tests/statement-possible/legacy-baseline.json`（message body 写了前后六项指标） |

## 1. 结论先行

| 指标 | 起点 | 终点 | 变化 | 达标 |
| --- | --- | --- | --- | --- |
| `RawTailBuildCount`（目标） | 139 | **6** | **−133（−95.7%）** | ⚠️ 未归零（残余 6 条逐条见 §4） |
| `ScanRootCallCount` | 388 | **226** | **−162** | ✅ 没有上升（下一阶段起点更低） |
| `LegacyStatementDispatchCount` | 0 | **0** | 0 | ✅ 保持归零 |
| `ShapeAstDeclinedCount` | 42 | **42** | 0 | ✅ 不变（不是本轮目标） |
| `TotalDeclined`（交叉校验） | 42 | 42 | 0 | ✅ 同步 |
| `FileFallbackCount`（交叉校验） | 50 | **27** | **−23** | ✅ **下降**（没有靠整文件重解析换数字） |

- **139 → 6** 全部是**路由 / 挂载**上的改动，没有一条是「改口径 / 换计数器」：`RawTailBuildCount` 的自增点
  （`BuildBlock` 的 raw 循环与 `CollectBodyStatements` 的三段 raw）**一个字节没动**，`raw-tail-attribution.mjs`
  的总数与官方指标仍然逐条相等（探针退出码 0）。
- **剩余 6 条**全部是**单条用例**，落在「模块体 / 装饰器成员 / 标点级 ASI」这些本轮没动的层，逐条列在 §4，
  每条都给了根因与下一步杠杆。
- **ScanRoot 下降 162** 是副作用而不是目标：块内声明不再走「raw → legacy 递归」，其中一部分判界也就不再问
  `ScanRoot`；`root-retirement` 仍然 **PASS**（默认解析 6300 用例上根候选 0 次 `ScanRoot`）。
- **FileFallback 50 → 27**：原来 23 个整文件兜底的文件现在能在默认路径上建出来。这是**额外收益**，也说明
  本轮没有把「先兜底再计数」当成降 raw 的手段（否则 fallback 会上升）。

## 2. 逐族修法

### 2.1 块内声明族路由（56 条：`async` 22 / `function` 16 / `@` 14 / `abstract` 4）

**根因**：5d-3 的根层声明壳在 `Decide` 里带一道 `!(head.Parent instanceof Bracket)` 门——块体里的同名声明
一律落 `Legacy`；而块体目录里确实没有认这三族 `Kind` 的候选，这道门在当时是**正确**的。5d-8a 的差别是：
块体目录里现在挂着 `ControlFlowStatementPossibleShape`（`CreateBodyPossibleShapes`），而它 `ComputeByIndex`
的 `declarationShell` 分支认的正是 `ShellFunctionDeclaration` / `ShellClassDeclaration` /
`ShellDecoratedDeclaration`——**候选已经在了，只差路由**。

**修法**（`statement-route-util.xl.md`）：

- 新增开关 `EnableBlockDeclarationShell:bool = true`（默认开）+ 计数 `BlockDeclarationShellCount`；
- `Decide` 的根层声明壳分支：条件是 `(!ownerIsBracket || blockDeclarationShell)`，其中
  `blockDeclarationShell` = 开关 + `EnableShellExpressions` + 「语句首的 `Parent` 是 `{` 括号」；
  分支体（`function` / 块外 `class` / `abstract class` / 同一行 `async function`）**一个字没改**，
  只在块体命中时 `BlockDeclarationShellCount += 1`；
- `@` 分支同一条条件（根层 / 块体共用）。
- **`class` 不在本开关里**：块内 `class` 仍由 4ae 转正的 `EnableBlockClassShell` 判成 `ShellStatementFamily`
  （`ScanRoot` + 体括号收口），那条分支在**前面**，行为逐位不变。

**为什么 AST 不可能变**：块内 `function` 声明壳的收口读
`StatementBoundaryUtil.DeclarationShellEndCode`（体括号 → 收在体括号），建树走
`StatementFamilyDispatch` → `BuildFunctionDeclaration()`——与 legacy `BuildStatement` 的 `function` 分支
**同一个 builder 方法、同一段 consumed 单元、同一个 `shell.Pos`**。块内语义的唯一差异（首条语句的 `Pos`
取 `{` 之后第一个字符）本来就在 `ControlFlowStatementPossibleShape.BuildByIndex` 的块口径里。

### 2.2 块内 `export` / `import` / 声明族体括号（22 条：`export` 10 / `import` 3 / `const enum` 4 / `enum` 3 / `namespace` 2）

**根因一（`export class A {}` 收不了口）**：`export` 在 `DecideDeclaration` 里判成
`ShellDeclarationFamily`，这一族原先与表达式族共用 `ExpressionEndCode`（调用位 ASI + `;` / EOF / ASI /
声明跟随边界）——它**不认体括号**，所以 `{ export class A {} export const b = 1; }` 的第一条声明永远收不了
口，把第二条一起吞进去，`BuildFromShell` 读到两条语句抛「语句没有读完」→ `DetachShell` → **块体整段 raw**。

**修法**（`statement-boundary-util.xl.md` + `statement-end-possible-shape.xl.md`）：

- 新增 `StatementBoundaryUtil.DeclarationFamilyBodyEndCode`：末代码单元是已闭合 `{…}`、`TypeBuilder.IsBodyBrace`
  认它是声明体、且 `IsBodyDeclarationHead` 认**这一条声明带体** → 返回它；
- 新增 `StatementBoundaryUtil.IsBodyDeclarationHead`：跳过 `export` / `declare` / `default` / `abstract` /
  `async` / `const` 这些修饰词之后，第一个真关键字是不是 `class` / `function` / `interface` / `enum` /
  `namespace` / `module` / `global`。**这一条不可省**：`IsBodyBrace` 把 `export { a }` 的导出列表、
  `import { a }` 的导入列表、`export type { A } from "m"` 的列表、`export default { … }` 的赋值表达式
  都看成体括号，不回答「这条声明有没有体」就会把 `from "m"` 丢掉（实测：`export type { X } from "m"`
  变成 1 条结构差）；
- `StatementEndPossibleShape` 的 `ShellDeclarationFamily` 分支与 `BuildByIndex` 的同名分支：
  **先问 `ExpressionEndCode`（与 4q 逐字相同），只有它给 `-1` 时才问体括号**。顺序不能反：
  `export default () => {}` ⏎ `(b);` 靠的正是 `ExpressionEndCode` 的**调用位 ASI** 收在 `}`，
  先问体括号会把它并成一个 `CallExpression`（实测 1 条结构差，已修）。

**根因二（被让给 legacy 的块内声明）**：`import x = require("m")` 与 `const enum E { A }`
在 `DecideDeclaration` / `DecideCommon` 里被让给 legacy（根层有 `ImportEqualsDeclarationPossibleShape` 与
`EnumDeclarationPossibleShape` 接），但**块体目录里没有 legacy 候选**，让出去只会整段 raw。

**修法**：

- `Decide`：块内 `export` 首格判 `ShellDeclarationFamily`（`export` 是保留字，块内不可能起表达式语句，
  不需要等第二个代码单元）；块内 `import` 在**非表达式位**（下一个代码单元不是 `(` / `.`）也判声明族；
- `const enum`：块内 `const` + 同一行 `enum` 判 `ShellVariable`（`StatementFamilyDispatch` 的 `KindAllows`
  接受 `const`、`BuildByHead` 的 `const` 分支本来就建 enum）；`VariableStatementPossibleShape` 加
  `IsConstEnumHead` 并**只在块体宿主**（`head.Parent` 是 `{` 括号）成立——根层若也 Accept 会与 legacy
  `EnumDeclarationPossibleShape` 同格双 Accept → `CatalogGuide` 抛错 → 文件级 fallback（实测）；
  壳的终结候选在 `const enum` 时自称 `ShellDeclarationFamily`（收口认体括号）。

**踩到的坑（已写进代码注释）**：`BuildByIndex` 里判 `IsConstEnumHead` 必须在 `host.Data.splice` **之前**——
搬完单元宿主 `Data` 就空了，判型恒 `false`，壳的终结候选退回默认族、**每格一次 `ScanRoot`**
（`root-retirement` 的「默认态 ScanRoot = 0」当场由 0 变 8）。修法是把判型提到搬单元之前。

### 2.3 函数表达式体 / 类静态块体 / `for await` 体（36 条）

三处都是「这个 `{` 没挂目录」，不是判界：

| 族 | 条数 | 根因 | 修法 |
| --- | --- | --- | --- |
| 函数表达式体（`const f = function (a) { … }` / `function* () { … }` / `async function () { … }`） | 13 | `OnChildBracketCreated` 的 `parent instanceof StatementShape` 分支只认箭头体（`arrowOnly = true`），函数表达式体的 `{` 前面是 `)` 不是 `=>` | `IsFunctionDeclarationBody(host, bracket, allowAnonymous = true)`：名字位置可以是 `*` / `function`（匿名）或名字（具名），其余判据（类型参数 / 参数表 / 体位置）一个字不改；新开关 `EnableFunctionExpressionBody` + 计数 `FunctionExpressionBodyMountCount` |
| 类静态块体（`class C { static { … } }`） | ~20 | 静态块由 `ClassDeclarationShape` 自己 `Load([staticBody]).BuildStatement()` → `BuildBlock()`，而类体括号是 legacy 建树（没有目录），`TryMountFunctionBody` 又只认 `)` / 返回类型——`static` 两个字都不满足 | `OnChildBracketCreated` 补一条：`{` 前一个非 trivia 单元是 `static`（`static x = { … }` 的 `{` 前一格是 `=`，不命中）→ `MountBodyCatalog(bracket)`；新开关 `EnableStaticBlockBody` + 计数 `StaticBlockBodyMountCount` |
| `for await (…) { … }` 体 | 3 | 体位置判据用闭合 `(…)` 往回**一格**找关键字，`for await` 的上一格是 `await` 不是 `for`（5d-6 §5 已记下的小缺口） | `TryMountControlFlowBody` 的关键字回看加一格：`await` 再往前是 `for` 时也算体位置 |

**为什么挂目录是安全的**：三处都只改变「谁建体内的语句」——建树仍是同一个
`StatementBuilder.BuildBlock()` 的 `HasBuiltBodyStatements` / `CollectBodyStatements`，不新增任何建树路径；
`BlockBodyWaitingPossibleShape` 保证「一个候选都不接」时目录不抛错。

## 3. 前后指标（同一语料逐用例）

语料不变：`files=1763 cases=6300 fileTsInvalid=10 lineSkipped=1269 crash=0`（`caseListSha256` 同上）。
基线已用 `--write-baseline` 重写，复跑 `verdict: PASS`。

| 指标 | 起点 | 终点 | 备注 |
| --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | 0 | 0 | 壳收口路径上仍没有一条退回 `BuildStatement()` |
| `ScanRootCallCount` | 388 | **226** | 块内声明不再进「raw → legacy 递归」，其中一部分判界不再问扫描器 |
| `RawTailBuildCount` | 139 | **6** | 块内声明路由 −56、声明族体括号 −22、三处体挂载 −36、其它 −19 |
| `ShapeAstDeclinedCount` | 42 | 42 | 本轮未动 |
| `TotalDeclined` | 42 | 42 | 与上一行同步 |
| `FileFallbackCount` | 50 | **27** | 23 个原来整文件兜底的文件回到默认路径 |
| `raw-tail-attribution` 总数 | 139 | **6** | 与官方指标逐条相等（探针退出码 0） |

## 4. 残余 6 条（逐条，都是单条用例）

| # | 用例 | 首单元 / 宿主链 | 根因 | 下一步杠杆 |
| --- | --- | --- | --- | --- |
| 1 | `tests/cases/token/statements/prefix-operand-newline.ts` | `a` ← 块体 `{`（无目录）← 文件 | `if (a) { a++; } --` ⏎ `a;`：TS 把 `--a;` 当第二条语句（前缀运算符不在它前面断句），本实现里那个 `{` 是 `if` 体、体目录在，但 `--` 之后的 `a` 落在「壳收口 + 尾巴重放」的 raw 段 | 尾巴重放（`FinishShell` → `Guide.ComputePossibleShapesByIndex`）对「前缀运算符 + 换行」这一格的补建 |
| 2 | `.../stmt-asi-return-newline-object.ts` | `a` ← `{`（有目录）← 函数体 `{` ← 语句壳 | `function f() { return { a: 1 } }`：块内标签 `a: 1` 没建标签壳 | 块内 `ShellLabel` 起点在 `a` 这一格被判 `None`（等 `:`），`:` 到达后的兼容通道没接住——属标签候选的晚建窗口 |
| 3 | `.../stmt-r1235-bare-block-tail.ts` | `a` ← 块体 `{`（有目录）← 语句壳 | `declare const a: any;` ⏎ `{ p: 1 }`t``：语句位的裸块后面那一截（`{ p: 1 }` 是块，`p: 1` 是标签） | 同上（标签晚建）+ 裸块与对象字面量的分岔 |
| 4 | `.../types/type-combination-adversarial.ts` | `return` ← 方法体 `{`（无目录）← 类体 `{` | `@dec2 @dec3 method<U extends …>(x: U): U extends any ? U : never { return x }`：**装饰器成员 + 泛型 + 条件类型返回类型**，方法体没挂上目录 | 类体括号是 legacy 建树，装饰器成员的体位置判据要能跨装饰器 / 类型参数 / 条件类型；`IsReturnTypeBrace` 的停止表已删 `extends`（本轮），但这一条还卡在「`>`（类型参数闭合）之后是 `:`」的形态 |
| 5 | `.../types/type-tail-linecomment.ts` | `return` ← 块体 `{`（**无目录**）← 文件 | `function f2(): string//c` ⏎ ` { return ""; }`：行注释把换行吃进 trivia，函数体 `{` 与 `)` 之间隔着注释 | 与 4 同一族（根层函数体挂载的 `IsReturnTypeBrace` 路径），单条 |
| 6 | `typescript/cases/module-blocks.ts` | `let` ← 内层裸块 `{` ← **模块体 `{`（无目录）** | `namespace N { { let x = 1; } }`：**模块体括号没有语句目录**（模块成员走 `ModuleBlockShape` 自己的成员目录），里面的裸块语句整段 raw | 给模块体挂「成员目录 + 语句目录」的合并入口（需要对 `ModuleBlockShape` 的建树路径单独立项，不能顺手挂语句目录——`export` / `import` 成员与语句候选会抢同一格） |

**为什么停在这里**：剩下 6 条都是**单条用例**，且都不在「路由 / 挂载」的统一杠杆上——
1-3 是标点级 ASI 的尾巴重放与标签晚建（属 `statement-shape` / 标签候选的层），
4-5 是「装饰器成员 + 条件类型返回类型」的体位置判据（要动类成员建树），
6 是模块体目录（要动 `ModuleBlockShape` 的建树路径）。按纪律 9 轮预算在第 7 轮起收尾，
不硬塞；每一条都给了下一步杠杆，下一轮可单独立项。

## 5. 默认全门读数（最终树，`xl_build` 0 error + `tsc` exit 0 之后实跑）

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
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38；knownGap=1 是既有的 `clause-nested-known-gap`） |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** |
| `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46** |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**（knownGap=1） |
| `tests/statement-possible/root-retirement.mjs` | **PASS**（默认解析 6300 用例上根候选 0 次 `ScanRoot`；false 态 216 次、逐位仍工作） |
| `tests/statement-possible/declaration-shell-boundary.mjs` | **74 / 74**（migrated=55、counterfactualSensitive=55） |
| `tests/statement-possible/control-flow-body-takeover.mjs` | **46 / 0** |
| `tests/statement-possible/block-body-takeover.mjs` | **21 / 0**，defaultFlag=true |
| `tests/statement-possible/decorated-declaration-takeover.mjs` | **14 / 14** |
| `tests/statement-possible/eof-last-token-close.mjs` | **13 / 13** |
| `tests/statement-possible/export-no-semicolon-eof.mjs` | **13 / 13** |
| `tests/statement-possible/declaration-shell-call-position.mjs` | **24 / 24** |
| `tests/statement-possible/import-expression-cases.mjs` | **9 / 9** |
| `tests/statement-possible/raw-tail-attribution.mjs` | 6 = 6（与官方指标同源） |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已重写为 0 / 226 / 6 / 42 / 42 / 27） |

**唯一非绿**：`tests/statement-possible/yield-boundary.mjs` **55 / 56**，失败的是它的**正对照**
`positive-class-shell`（`{ class C {} }` 期望「终结候选路径上 `ScanRoot > 0`」）。
这条失败**不是本轮引入的**：把本轮 6 个 `.xl.md` 全部 stash、重建、复跑，基线 `029aeeac` 上同样是 55/56。
根因是 5d-7 的 `DeclarationBodyEndCode` 早已把块内 `class` 壳的判界迁到 0 次 `ScanRoot`，而 5d-6 写的这条
「计数器不是空转」的正对照还假设它 > 0。**结论**：`ScanRoot` 计数器在默认态已经没有任何族可作正对照
（`root-retirement` 也证明默认态全语料 0 次）；要保留这条对照，应改成「false 态（文件级 fallback）仍有
216 次」——`root-retirement` 已经这么断言了。本轮按纪律没有顺手改另一个阶段的探针。

## 6. 探针改动（两个文件，都是**预期**而不是判据）

| 文件 | 改动 | 为什么这不是「改测试换绿」 |
| --- | --- | --- |
| `tests/statement-possible/declaration-shell-boundary.mjs` | `fn-nested` 期望 `fn: 1 → 2`；`class-body-method-function` 加 `fn: 1`；`keep-block-function` / `keep-if-body-function` → `block-function` / `if-body-function`（`fn: 1`，`migrated: false` 并写明原因） | 这三条是 5d-3 写的「**块内 function 未迁**」用例；本轮把块内 function 迁了，用例必须如实改成「已迁」。`migrated: false` 是刻意的：本文件的 `migrated` 检查的是「关掉开关后 **legacy 根候选**是否被调用」，而块内 function 关掉开关后的回退是**块体 raw 循环**（根候选根本不参与），那条回退由 `raw-tail-attribution` 的 raw 计数与本文件的 XML/AST 逐字节断言覆盖 |
| `tests/statement-possible/control-flow-body-takeover.mjs` | 8 条块内 function 用例的 `body` 增量 +1（声明本身现在也是块体目录收集的一条语句）、`cf` 归 0（壳记在 `FunctionDeclarationShellCount` 而不是 `ControlFlowShellCount`）；`{ enum E { A } }` / `{ declare const x: number; }` 的 `body: 0 → 1` | `BlockBodyStatementCount` 的口径没变，变的是**事实**：以前声明留 raw、只有体内语句被收集；现在声明本身是壳，`CollectBodyStatements` 自然把它也计一条。XML / AST 断言（同一个文件里）一条没放松 |

`tests/statement-possible/legacy-baseline.json` 由 `--write-baseline` 生成，**单独 commit**。

## 7. 风险与注意

1. **三个新开关**（默认全开，关掉即逐位回到本轮之前）：
   `StatementRouteUtil.EnableBlockDeclarationShell`（块内 function / abstract class / async function / 装饰器路由）、
   `BlockPossibleShape.EnableStaticBlockBody`（类静态块体挂目录）、
   `BlockPossibleShape.EnableFunctionExpressionBody`（函数表达式体挂目录）。
   关掉 `EnableBlockDeclarationShell` 后 raw 会回到 139 附近（其余两项仍然生效）。
2. **`DeclarationFamilyBodyEndCode` 是「只增」判据**：调用方先问 `ExpressionEndCode`，只有 `-1` 才问它。
   如果将来给声明族加新的收口形态，顺序必须保持（先既有、后补充），否则会丢调用位 ASI。
3. **`IsBodyDeclarationHead` 的修饰词表与「带体声明」表是闭集**：将来新增带体声明（例如新的 `declare` 形态）
   要同时更新这两张表，否则那类声明会退回「收在 `;` / ASI」的老路径（不会错树，只是不接管）。
4. **`const enum` 的 `Kind` 借用**：块内 `const enum` 走 `ShellVariable`（`Kind` 保持 `0`）+ 终结候选自称
   `ShellDeclarationFamily`。这是一处**语义借位**，注释里写明了理由（`StatementFamilyDispatch` 的 `const`
   分支本来就建 enum，`KindAllows` 也接受 `const`）。如果将来把 `const enum` 提成独立族，这里要一起改。
5. **`dist/` / `build/` 是生成物**（gitignored）。复现前必须 `xl_build` + `tsc`，否则 `build/ts` 是旧代码，
   所有探针读数都会对不上。
6. `tmp/` 里的调查脚本（`probe*.mjs` / `attrib-*.mjs` / `exp-*.mjs` / `patch-cfbt*.mjs` / `ast-skeleton.cjs`）
   是调查用，**未入库**；正式探针仍是 `raw-tail-attribution.mjs` 与 `legacy-retirement.mjs`。
7. **`yield-boundary` 的正对照已过期**（§5）：本轮实测在 `029aeeac` 上就失败，与本轮无关；但它会一直红，
   下一轮建议改成正对照指向 false 态（或删掉这条对照，理由写进探针注释）。

## 8. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d8a

# 生成 + 编译（改了 .xl.md 之后必须按这个顺序；xl_build 用工具，cwd=本目录）
#   xl_build: paths=["core","typescript"], targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json

# 指标
node tests/statement-possible/legacy-retirement.mjs            # 与基线比对，应 PASS
node tests/statement-possible/legacy-retirement.mjs --quiet    # 只看总计
node tests/statement-possible/raw-tail-attribution.mjs --top=20 # 剩余 raw 归族（总数必须 = 官方）
node tests/statement-possible/raw-tail-attribution.mjs --verbose

# 全门（本轮实跑的完整清单见 §5）
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
node tests/statement-possible/root-retirement.mjs
node tests/statement-possible/declaration-shell-boundary.mjs
node tests/statement-possible/control-flow-body-takeover.mjs

# 回退
git revert --no-edit <基线 commit>   # 先撤基线（否则指标与源码不一致）
git revert --no-edit <源码 commit>   # 再撤源码
# 或整体：git reset --hard 029aeeac（会丢掉两个 commit，谨慎）

# 只回退某一个族（不必改源码，行为逐位回到本轮之前）：
#   块内声明族路由 : StatementRouteUtil.EnableBlockDeclarationShell = false
#   函数表达式体   : BlockPossibleShape.EnableFunctionExpressionBody = false
#   类静态块体     : BlockPossibleShape.EnableStaticBlockBody = false
# 然后 xl_build + tsc；指标变化后要重写基线（--write-baseline）才能 PASS。
```
