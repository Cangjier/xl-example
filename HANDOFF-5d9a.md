# HANDOFF 5d-9a：退场残余清零（FileFallback 8→4、RawTail 5→4、Declined 8→2）

分支 `feature/possible-statement-5d9a`，起点 HEAD = **`1dda7beb`**（5d-1a…5d-8c + gap-edge2 全部合并后）。
本文件是这一轮的**唯一结论来源**：数字、逐条根因与修法、剩余清单、复现命令。

## 1. 结论先行

| 指标 | 起点 `1dda7beb` | 终点 | 差 |
| --- | --- | --- | --- |
| `FileFallbackCount`（整条文件 legacy 重解析） | **8** | **4** | **−4（−50%）** |
| `RawTailBuildCount`（块体 raw 尾巴逐条建树） | **5** | **4** | **−1（−20%）** |
| `ShapeAstDeclinedCount` / `StatementShapeAst.TotalDeclined` | **8** | **2** | **−6（−75%）** |
| `ScanRootCallCount`（随 fallback 条数下降） | 86 | **46** | **−40** |
| ├ 默认态（`EnableShellExpressions === true`） | 0 | **0** | 0 |
| └ fallback 态（`FileFallback` 那 4 条的重解析） | 86 | 46 | −40 |
| `LegacyStatementDispatchCount` | 0 | **0** | 0 |
| 仍有 legacy 读数的用例 | 19 / 6300 | **10 / 6300** | −9 |
| 全门 | — | **零回归**（§5） | ✅ |

**21 个残余单元里清掉 13 个**（Declined 6、FileFallback 4、RawTail 1 + 1 个用例的三列同时归零），
剩 8 个（Declined 2 / RawTail 4 / FileFallback 4…）。**没有做到三项全 0**：剩下的是 4 个各自独立的机制缺口，
逐条列在 §4，每条都给了根因、已定位到的具体方法与下一步杠杆。

**没有关任何开关、没有改语料 / 探针口径、没有「换个计数点」、`core/**` 一字未动、
`IsAsiBoundary` 的函数体未改**；AST / XML 全部逐位一致（§5 的 `ast-json-diff` 0/0/0 就是取证）。

三个 commit：

| commit | 内容 |
| --- | --- |
| 源码那次 | 6 个 `.xl.md`（全部在 `typescript/tokens/statements/**`）+ 新增入库探针 `tests/statement-possible/tail-residual-cases.mjs` + 本文件；message：`fix(statements): 退场残余清零（fallback/raw 尾巴/形状拒绝，Stage 5d-9a）` |
| 基线那次 | **基线单独 commit**：`tests/statement-possible/legacy-baseline.json`（body 里写了前后五项与剩余清单） |

## 2. 归因方法（沿用 5d-8a / 5d-8b / 5d-8c 的探针，口径一个字没改）

- **Declined**：`legacy-retirement.mjs --top=40` 定位到 8 个用例，再用「包一层 `StatementShapeAst.Decline`
  收集 `LastDeclineReason`」把每条的**最终拒绝原因**读出来（`tmp/decline-attrib.mjs`，调查用、未入库）。
  这比读总数有用得多：8 条只有 5 种原因字符串。
- **RawTail**：`raw-tail-attribution.mjs`（总数与官方指标逐条相等，探针退出码 0）。
- **FileFallback**：`file-fallback-attribution.mjs` 的 A/B 两段——B 段把 `EnableFileFallback=false` 让它直接抛，
  沿 `Message` / `InnerException` 取最内层文本；再用 `tmp/typealias-trace*.mjs` 这类「包一层建造器方法」
  的临时探针定位到具体方法 + 具体单元。
- 每一条都先写出**最小的合法源码**（不是语料里的那一行）复现，再改代码。

新入库的探针 `tests/statement-possible/tail-residual-cases.mjs`（**24 例，全绿**）是本轮的**正面证据**：
每一类修复形态都有自己的用例，并且**每类都带反事实档**（判据不许在相邻形态上生效）。四组：

| 组 | 覆盖 | 反事实档 |
| --- | --- | --- |
| `postfix-no-line-break` | `a` ⏎ `++b` / `a` ⏎ `!b`（LF / CR / LS / PS 四种行终止符）、`x++` ⏎ `++y` | 同行 `a!` / `a++` 仍是一条；换行后的 `(` 仍是调用 |
| `prefix-operand-newline` | `a++; --` ⏎ `a;`（裸的 / 带跨行注释 / 块语句之后） | `e++` ⏎ `++e`、`g++;` ⏎ `--g` 仍是两条 |
| `contextual-declaration-head` | `type` ⏎ 名字（LF / CR / LS / PS / 块注释里的换行） | 同行 `type T = 1` 仍是一条 TypeAliasDeclaration |
| `function-expression-type-params` | `(function <T>(x: T) { return x; })(1)` | `f<T>(1)` / `f<string>` 仍是类型实参调用 |

每条断言四件事：XML 与 legacy 档**逐字节相同**、`FileFallbackCount=0`、`TotalDeclined=0`、
`LegacyStatementDispatch=0`、`RawTailBuildCount=0`，加上「期望节点计数」（数 XML 里的节点）。
`minShapeAst: 0` 只用在**声明族**那一条反事实上，并在注释里写明理由（声明不经过 `StatementShapeAst`）。

## 3. 逐条根因与修法（三类十一条，全部在 `typescript/tokens/statements/**`）

### 3.1 Declined：后缀 `++` / `--` / `!` **不能跨行**（消 4 条用例 / 5 条读数）

**触发**：`a` ⏎ `++b`、`a` ⏎ `!b`、`x++` ⏎ `++y`（`end-compute.ts` L383/385/394 用的是 U+2028，
`stmt-asi-prefix-increment-after-statement.ts` 用的是 LF；两者都被本实现当成同一格）。

**根因**（两层，缺一不可）：

1. **建树一侧**（`statement-operator-body.xl.md` 的 `Ingest`）：`ExpectOperator` 位置的 `++` / `--` / `!`
   无条件走 `StartPostfix` / `StartNonNull`，于是形状树长出一格**语句单元之外**的操作符单元，
   收口器只能拒绝（`后缀运算符单元不在表达式里` / `非空断言的 ! 单元不在表达式里`）。
2. **判界一侧**（`statement-builder.xl.md` 的 `BuildExpressionStatementFromShapes`）：`a++; --` ⏎ `a;`
   里 `--` 是**前缀**、操作数在下一行，但 `StatementBuilder.EndsAtLineBreak` 的「前一个单元能收尾表达式」
   一列把 `--` 算作能收尾（那是对的，`a++` 能），它分不出前后缀 → 表达式被切成 `[--]` 一格。

**修法**（与 TS 的同一句判据）：

- `Ingest` 顶部记一格 `PreviousUnit`（**字段**，因为 `Ingest` 会被自身递归调用两处、`Ingested` 不前进）；
  `ExpectOperator` 里 `++` / `--` / `!` 若与它之间 `LineTerminator.HasBetween` 为真 ⇒ `Closed = true`
  （表达式到此为止，**不算未实现**）。这就是 TS `parsePostfixExpressionOrHigher` 的
  `scanner.hasPrecedingLineBreak()` 守卫。
- `ExpressionStatementPossibleShape.IsPrefixOperatorWithoutOperand(units, index, limit)`（**新，唯一实现点**）：
  「这一格是 `++` / `--` 且它前面没有能收住表达式的代码单元」⇒ 前缀。`StatementBoundaryUtil.IsAsiBoundary`
  原来那段**内联**判据逐字搬进它（判据不变，只是多了一个读者），`BuildExpressionStatementFromShapes`
  的 ASI 循环加一条 `!IsPrefixOperatorWithoutOperand(...)`。

### 3.2 FileFallback：`type` 与名字之间是 CR / U+2028 / U+2029（消 3 条用例，ScanRoot −6）

**触发**：`possible-compute.ts` L331–333（`type\rT = 1` / `type\u2028T = 1` / `type\u2029T = 1`）。

**根因**：`type` 与名字之间有行终止符 ⇒ TS 侧 `type` 是标识符、是**两条** ExpressionStatement
（`nextTokenIsOnSameLineAndCanFollowModifier`）。本实现的 `StatementRouteUtil.DecideDeclaration` 只对
`declare` 做了这条同行判据（5d-8c 的 D 类），`type` / `module` / `namespace` 漏了 ⇒ 路由仍是
`ShellDeclarationFamily`；而 `Decide` 的 `None` 在 `DeclarationStatementPossibleShape.ComputeByIndex` 里
被当成「第二格还没到，继续等」⇒ 在名字那一格与 `SourceFileEndPossibleShape` 的 ASI 边界**同时成立**
⇒ `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 2）` ⇒ 整条文件 fallback。

**修法**：

- `StatementRouteUtil.DeclinesDeclarationHead(units)`（**新，唯一实现点**）：首两格是
  `type` / `module` / `namespace` + 名字（Common 或字符串字面量）+ 两者之间**有行终止符** ⇒ 真。
  `DecideDeclaration` 读它返回 `None`（与 `declare` 那条同一个 `NoLineBreakBetween`）。
- `DeclarationStatementPossibleShape.ComputeByIndex`：`route === None` 时**再问一次**它——
  为真就 `Reject`（本族对这条语句确实没有归属），否则维持 `Uncertain`（第二格真的还没到）。
  **为什么不直接把 `None` 一律当 Reject**：`import x`（`import x from "m"` 的第三格还没到）也是 `None`，
  那一种必须继续等，否则 import-equals / import 声明的壳再没人建。

`enum` / `interface` / `global` **刻意不在这一列**：实测 TS 对它们不要求同行
（`enum` ⏎ `E { A }` 仍是 EnumDeclaration，`global` ⏎ `{ }` 仍是 ModuleDeclaration）。

### 3.3 Declined：函数表达式头部里的 `<…>` 不是类型实参调用（消 1 条用例）

**触发**：`tests/cases/token/expressions/expr-function-generic-anonymous.ts`
`(function <T>(x: T) { return x; })(1)`，拒绝原因 `表达式体不完整（圆括号参数表后面不是 =>）`。

**根因**（链条比看上去长，逐格量出来的）：

1. 圆的括号里那个嵌套体的 `Units` 是 `function < T > (x: T) {…}`；
2. `Ingest` 顶部的 `<` 记账**不看 `Expect`**（只排除了 `ExpectTypeTail` / `ExpectArrowTail`），
   于是函数表达式**类型参数表**的 `<` 也被记成 `SawLessThan`；
3. 嵌套体收口时 `IngestAll` 的「嵌套体类型实参尾巴」分支看到 `SawLessThan` + `HasTypeArgumentCall`
   ⇒ `ResetState()` + `ReplayUntil(第一个 `<` 的下标)`；
4. 重放上界正好落在 `<` 上，而那时 `Expect === ExpectBody`（函数头还没走完）⇒ 重放返回 `false`
   ⇒ 嵌套体只剩半条（`Ingested=2`，`Expect=ExpectBody`，`IsComplete()=false`）；
5. `BuildOperand` 于是把它退回**未解析参数表**（`KindParen` 无子节点 = `HasLooseParen()` 为真），
   外层读到第二格 `(1)` 时 `Fail("圆括号参数表后面不是 =>")`。

**修法**：`Ingest` 的 `<` 记账再排除一格 `ExpectBody`——函数 / 类**表达式头部**里的 `<` 是类型参数表
（`function <T>` / `class <T>`），不是「`<` 是小于号还是类型实参表」那个歧义。一行条件 + 注释。

### 3.4 另外 1 个用例的三列同时归零

`tests/cases/token/statements/prefix-operand-newline.ts` 原来是
`[legacy 0, scanRoot 34, rawTail 1, declined 1, fallback 1]`，现在是**全 0**：
它的第一格 `let a = 1; a++; --` ⏎ `a;` 同时是 3.1 的两个缺口（建树 + 判界）与 5d-8c §4 第 4 类
（前缀 `--` 换行接操作数）的同一格——3.1 修完它自己就全绿，`rawTail` 的那 1 次与被它污染的 34 次
`ScanRoot` 都是这一格的下游。

## 4. 剩余清单（8 个单元 / 6 个用例）与原因

| # | 指标 | 用例 | 根因（本轮已量到方法 + 单元级） | 下一步杠杆 |
| --- | --- | --- | --- | --- |
| 1 | FileFallback 4（ScanRoot 46 全部来自它） | `type-fn-return-typeliteral.ts`、`gap-r1244-ctor-signature-generic-return-type.ts`、`dts-types.ts:L68`、`types.ts:L430` | **函数 / 构造签名的返回类型字面量**（`type A = (o: X) => { a: number }`）。实测：`{…}` 的**归属**是竞争点——`TypeBuilder.ParseTypeLiteral` 拿到的 `bracket.Data` 里已经是 `LabeledStatementShape`（语句层先把那个 `{` 当块、把 `a: number` 当标签建掉了），于是 `ParseTypeMember` 抛「不支持的对象类型成员」。**同一份源码是否红取决于上下文**：单独解析一元 `=> { a: number }` 红、二元 `=> { a: number, b: string }` 反而不红；文件里第一条 `type A1 = …` 绿、第二条 `type A2 = …` 红 ⇒ 说明先建的壳保住了 raw 单元，后建的那条被块目录抢了 `{` | 把「`=>` 之后那个 `{` 是**类型位**」的判据接到块括号的目录创建处（`Bracket.OnBracketCreatedEvent` 的宿主问询那一格），或让声明候选在 `=>` 之后**先于**块候选接管。两者都要动「类型位 vs 语句位」的交界，回归面覆盖每个含 `{` 的语句 ⇒ 单独一轮 + 反事实 |
| 2 | Declined 1 | `expression.ts:L107`（`new new A()()`） | `KindNew` **整格委派** `ParseNew()`（不建子节点）。树长成 `call(new(new(A)), ())`——外层的第二个 `()` 被当成**对构造结果的调用**，而 `ParseNew` 已经把整段（含那个 `()`）消费完 ⇒ 收口时 `Covers` 拿到 `covered=[0,1,2,3,4,4]`、`expected=5` ⇒ 「形状树没有覆盖整段表达式单元」。AST 本身是对的（`NewExpression(NewExpression(A))`） | 让嵌套 `new` 的**前缀栈**像箭头 / 类型断言那样按 `TailEnd` 核区间：`AttachOperand` 把内层 `new` 交给**外层** `KindNew` 当被构造者（要动前缀栈的归属，不止一处） |
| 3 | Declined 1 | `expression.ts:L704`（`((x: any): x is A => true)`） | 箭头参数表带**类型标注 + 返回类型谓词**（`(x: any): x is A`）：形状层的未解析参数表只认「一个标识符」或「一对圆括号」，升级成「能带类型标注与返回类型谓词」的形状节点是 5d-8b §4 第 3 类留下的设计工作 | 按 5d-8b §4 的方案给参数表一个新 Kind（`KindParams`），而不是塞进 `KindParen` |
| 4 | RawTail 1 | `stmt-asi-return-newline-object.ts`（`function f() { return` ⏎ `{ a: 1 } }`） | **`return` 受限产生式之后的裸块没被块体目录建**。实测：`return;` ⏎ `{…}` 是 0 次 raw、`return` ⏎ `{…}` 是 1 次；`{…}` 作为块体第一条语句也是 0 次 ⇒ 只有「`return` 换行收口」这一格，`{` 的目录归属跟着 return 的壳走，壳撤了以后那个 `{` 就只剩 raw | 在 return 壳收口时把「`{` 的目录归属」交回宿主（与 5d-8c §4 第 1 类「晚建壳搬走未闭合括号」是同一族时序问题的**读取侧**） |
| 5 | RawTail 1 | `stmt-r1235-bare-block-tail.ts`（`declare const a: any;` ⏎ `{ p: 1 }`t``） | 语句位的**裸块后面那一截**：裸块后面的尾巴落进 raw 段。与 5d-8c §4 第 1 类同族（裸块不是 `IsStatementUnit` 的成员） | 尾巴重放对「裸块 + 后缀」这一格的补建 |
| 6 | RawTail 1 | `type-combination-adversarial.ts`（`@dec2 @dec3 method<U …>(x: U): U extends any ? U : never { return x }`） | **装饰器成员 + 条件类型返回类型**：方法体的 `{` 没挂上体目录（`IsReturnTypeBrace` 停在 `>` 之后那个 `:`） | 类成员的体位置判据要跨装饰器 / 类型参数 / 条件类型；单独一轮 |
| 7 | RawTail 1 | `module-blocks.ts:L9`（`namespace N { { let x = 1; } }`） | **模块体括号没有语句目录**（模块成员走 `ModuleBlockShape` 自己的成员目录） | 给模块体挂「成员目录 + 语句目录」的合并入口（不能顺手挂，`export`/`import` 成员会与语句候选抢同一格）——5d-8a §4 第 6 条原样未动 |

**没有假绿**：上表每一条的读数都在 `legacy-retirement.mjs` 的基线里逐用例记着（`perFile`），
下一轮直接 `--top=40` 就能看到它们还在；新基线是 `0 / 46 / 4 / 2 / 2 / 4`，不是 0。

## 5. 全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑，最终树）

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
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38，knownGap=1 既有 `clause-nested-known-gap`） |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** |
| `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46** |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**，knownGap=1（既有） |
| `tests/statement-possible/shape-ast-coverage.mjs` | cases=50 **pass=46 known=4 fail=0**（4 条 known 与 5d-8b 的清单同一份，本轮没改绿） |
| `tests/statement-possible/root-retirement.mjs` | **PASS**（默认态全语料 `ScanRoot=0`；false 态 69 次、逐位仍工作；fallback 语料 4） |
| `tests/statement-possible/declaration-shell-boundary.mjs` | **74 / 74**（migrated=55、counterfactualSensitive=55） |
| `tests/statement-possible/control-flow-body-takeover.mjs` | **46 / 0** |
| `tests/statement-possible/block-body-takeover.mjs` | **21 / 0**，defaultFlag=true |
| `tests/statement-possible/decorated-declaration-takeover.mjs` | **14 / 14** |
| `tests/statement-possible/eof-last-token-close.mjs` | **13 / 13** |
| `tests/statement-possible/export-no-semicolon-eof.mjs` | **13 / 13** |
| `tests/statement-possible/declaration-shell-call-position.mjs` | **24 / 24** |
| `tests/statement-possible/import-expression-cases.mjs` | **9 / 9** |
| `tests/statement-possible/comma-import-fallback.mjs` | **16 / 16** |
| `tests/statement-possible/tail-residual-cases.mjs`（**本轮新增**） | **24 / 24**（四组修复形态 + 反事实档） |
| `tests/statement-possible/file-fallback-attribution.mjs` | **PASS**（7 ≤ 13，2 类都在台账内，0 新类别）——见下 |
| `tests/statement-possible/raw-tail-attribution.mjs` | 4 = 4（与官方指标同源，3 族） |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已更新为 0 / 46 / 4 / 2 / 2 / 4） |

**唯一非绿**：`tests/statement-possible/yield-boundary.mjs` **55 / 56**，失败的是它的正对照
`positive-class-shell`（`{ class C {} }` 期望「终结候选路径上 `ScanRoot > 0``）。这条失败
**不是本轮引入的**：5d-8a 的 §5 已经把它记为既有非绿（把当时的 6 个 `.xl.md` 全 stash、在基线 `029aeeac`
上复跑同样是 55/56），根因是 5d-7 把块内 `class` 壳的判界迁到 0 次 `ScanRoot` 之后，这条正对照的前提
（`ScanRoot > 0`）在**默认态**已经不成立——`root-retirement.mjs` 的「默认态全语料 6300 用例 0 次
`ScanRoot`」是同一件事实的正面取证。本轮改的四处（后缀跨行 / 前缀操作数 / 上下文声明头同行 / `ExpectBody`
里的 `<`）都不在那条路径上。

另：`file-fallback-attribution.mjs` 的台账仍是 5d-8c 写下的 4 类 13 条（观测 7 ≤ 13，判 PASS）。
本轮**没有**改它的 `EXPECTED`：它量的是**原因**，而这 7 条的 2 个类别都还在台账里。

## 6. 改动的文件

源码（6 个，全部 `typescript/tokens/statements/**`，`+153 / −26` 量级）：

| 文件 | 改了什么 |
| --- | --- |
| `statement-operator-body.xl.md` | 新字段 `PreviousUnit`（`ResetState` 一起清）；`Ingest` 顶部记它；`ExpectOperator` 的 `++`/`--`/`!` 跨行 ⇒ `Closed`；`<` 记账排除 `ExpectBody` |
| `expression-statement-possible-shape.xl.md` | 新静态方法 `IsPrefixOperatorWithoutOperand`（`IsAsiBoundary` 原内联判据的逐字搬迁 + 新读者） |
| `statement-boundary-util.xl.md` | `IsAsiBoundary` 的前缀 `++`/`--` 判据改为调它（行为不变，判据只留一份） |
| `statement-builder.xl.md` | `BuildExpressionStatementFromShapes` 的 ASI 循环加 `IsPrefixOperatorWithoutOperand`（+ 前一代码单元的回溯） |
| `statement-route-util.xl.md` | 新静态方法 `DeclinesDeclarationHead`（+ `String` 导入）；`DecideDeclaration` 读它返回 `None` |
| `declaration-statement-possible-shape.xl.md` | `ComputeByIndex` 的 `route === None` 分两种：已判否（`Reject`）/ 还没到（`Uncertain`） |

探针：`tests/statement-possible/tail-residual-cases.mjs`（**新增，入库**）。
基线：`tests/statement-possible/legacy-baseline.json`（`--write-baseline` 生成，单独 commit）。

## 7. 风险与注意

1. **`PreviousUnit` 是「上一格」的唯一来源**：`Ingest` 会被自身递归调用两处（`,` 收箭头顶层逗号、
   类型区域收口），那两处 `Ingested` 不前进。字段在 `Ingest` 开头无条件更新，递归那一格的「上一格」
   就是它自己（`HasBetween(x, x)` 恒假）——所以跨行判据在递归里不会误判。将来若加新的 `Ingest`
   递归调用点，这条仍然成立；若改成「从 `Ingested` 反推」，**会立刻错**。
2. **`IsPrefixOperatorWithoutOperand` 与 `IsPostfixOperatorAt` 不是一回事**：前者问「左边有没有操作数」
   （不看换行），后者问「是不是紧贴同一行的后缀」。`x++` ⏎ `++y` 的第二格在前者眼里是前缀、
   在换行处**确实**要断句——把两处换成同一个函数会让那 2 条用例回退。
3. **`None` 的两种含义已经显式分开**：`DeclinesDeclarationHead` 只覆盖 `type` / `module` / `namespace`。
   `enum` / `interface` / `global` 故意不在列（TS 不要求同行）。若将来发现别的上下文关键字也要同行，
   **只改那一个方法的清单**，两个读者（`DecideDeclaration` / 声明壳候选）自动同步。
4. **`<` 记账的排除条件现在是三条**（`ExpectTypeTail` / `ExpectArrowTail` / `ExpectBody`）。
   它是「收口时要不要试类型实参尾巴」的唯一闸门；漏一格就是半条本体 + 一条 Decline（本轮 3.3 的成因）。
5. **剩余 8 条不要「顺手」放宽**：4 条 fallback 是「类型位 vs 语句位」的 `{` 归属竞争，
   3.1 那种「建树 / 判界各改一处」的做法在这里不适用（改了会让每个含 `{` 的语句都动）。

## 8. 复现与回退

```powershell
# 0) 目录
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d9a

# 1) 生成 + 编译（改了 .xl.md 之后必须按这个顺序；xl_build 用工具，cwd=本目录）
#    xl_build: paths=["typescript/tokens/statements"], targets=["ts"]
#    （要给全量就用 paths=["core","typescript"]；依赖注释补齐靠 tsc 抓 TS2304）
node node_modules/typescript/bin/tsc -p tsconfig.json   # 必须 exit 0

# 2) 指标（前四项 + 两个交叉校验）
node tests/statement-possible/legacy-retirement.mjs --quiet
node tests/statement-possible/legacy-retirement.mjs --top=40      # 还走 legacy 的用例
node tests/statement-possible/legacy-retirement.mjs --write-baseline
node tests/statement-possible/raw-tail-attribution.mjs            # 总数必须 = 官方 RawTail
node tests/statement-possible/file-fallback-attribution.mjs       # 原因聚类（台账子集）

# 3) 本轮新增的专用用例（四组修复形态 + 反事实）
node tests/statement-possible/tail-residual-cases.mjs

# 4) 全门（§5 的读数就是按这个顺序跑出来的）
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
git status --porcelain typescript/cases      # 必须为空
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
node tests/statement-possible/root-retirement.mjs
node tests/statement-possible/shape-ast-coverage.mjs

# 5) 回退
git log --oneline -3                          # 源码 commit / 基线 commit
git revert --no-commit <基线 commit> ; git revert --no-commit <源码 commit> ; git commit
# 或整体：git reset --hard 1dda7beb            # 回到本轮起点（会丢掉两个 commit，谨慎）
# 然后重跑步骤 1) 的 xl_build + tsc，再跑 2)——旧基线下读数是 0 / 86 / 5 / 8 / 8 / 8
```

**只回退某一类（不必改源码）**：本轮**没有新开关**，四类修复都直接写在判据里。要单类回退只能回退文件：
3.1 = `statement-operator-body.xl.md` + `expression-statement-possible-shape.xl.md` +
`statement-boundary-util.xl.md` + `statement-builder.xl.md`；3.2 = `statement-route-util.xl.md` +
`declaration-statement-possible-shape.xl.md`；3.3 = `statement-operator-body.xl.md` 的那一行条件。
