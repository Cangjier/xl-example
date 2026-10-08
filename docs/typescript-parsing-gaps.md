# TypeScript 解析：现状、口径边界与不再试的改法

**这份文件只装「今天还有用」的东西**：口径边界、怎么量缺口、解析层的硬规矩、被证伪的改法。
逐轮的现场（每次的根因、探针、差分读数）在 **git 历史**里，不再往这里堆；
**当前读数只有一份**（README 的「当前状态」表），这里不再抄数字，免得两处各说一套。

## 现状

`cases:tsast` 的语料（`node_modules` 的 `@types` / `typescript/lib` / `undici-types`
加本项目的 `dist/ts/**`、`samples`、`tests/parse/cases/**`）**逐文件全绿**，
`SyntaxKind` 全表与语料的差集只剩**合成节点**
（`Bundle` / `Count` / `SyntaxList` / `Synthetic*` / `NotEmitted*` / `PartiallyEmittedExpression`，
它们不由源码解析产生）与 **JSX 那一族**（见下）。

**但「语料全绿」不等于「构造全对」**：语料里有什么形状，取决于这些文件碰巧怎么写。
所以另有一份**片段探针池**（`tmp/k7-snips-big.mjs`，388 条合法的一两行片段，逐条对拍），
它量出来的才是「已知仍开着的缺口」那一张表——**加宽语料之前先看它**。

## 怎么量缺口

0. **先写小片段探针**：`node tests/parse/ts-ast.mjs --snippets <文件.mjs>`
   在**一个进程**里把几百条一两行的片段逐条与 `ts.createSourceFile` 对拍（`{ id, src }` 的数组，
   TS 自己非法的片段跳过、产物抛异常的片段报 `CRASH` 而不会打断整轮）。
   `--file` 是一份文件一个进程，量小片段时进程启动就是全部成本——普查一律走这一条。
   **量出来一条就补一个带 `xl:known-gap` 的用例**（见「已知仍开着的缺口」那一节）：
   探针池是产线索的地方，语料才是清单的家。
1. **语法有效性基准**是 TypeScript 自己的 parser：`ts.createSourceFile(...).parseDiagnostics`，
   只有 TS 认为合法的样本才算缺口。
2. **两条路一起用**：`cases:tsast` 量**形状**（与 `ts.createSourceFile` 逐节点比 kind / 区间 / 字段名，
   坐标是地基——没有坐标就只能靠文本猜位置，一遇到壳节点就断）；`coverage` 量**语义**
   （同一份 `.ts` 交给 `node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码）。
3. **加宽语料之前先普查**（`npm run coverage:sweep -- <候选.mjs>`）：候选的形状与 `cases/*.mjs` 一样，
   但**不写读数、不看台账、不红**——拿 `run.mjs` 去试会得到一片红，红里混着「真坏了」与「本来就还没做」。
4. **搜缺口要写小片段探针**（一条一个构造、同进程对拍）：203 条片段一次就翻出六处真缺口
   （第 623 轮），比读大文件快得多。

## 口径边界（**明确不做**，不是缺口）

| 边 | 为什么 |
| --- | --- |
| **JSX / TSX** | 独立于 TypeScript 的语法扩展，不在 `.ts` 范围内。四个 `.tsx` 用例只钉住「不抛异常 / 不吞掉后面的代码」 |
| **`RegExp`** | `runtime-architecture.md` §15 那张「明确不做」的表里（与 `BigInt` / `Proxy` / `Intl` 同档） |
| **装饰器的运行期语义** | 同一张表；`node` 的类型剥离与变换两种模式都拒收，裁判给不出来 |
| **多文件模块加载** | 由宿主的装载器决定；`tsrun` 的口径是**单文件** |
| **`Object.freeze` 之后写属性 / 只读访问器上赋值** | 本仓一律抛（**严格模式**的选择）；`node` 把 `.ts` 当 CJS 跑是松散模式、静默失败 |
| **`console.log(new Error("x"))`** | Node 打的是**栈**（含 V8 内部帧，行号随宿主版本变），逐字复现不在目标里 |

## 解析层几条硬规矩

- **ASI 按形状预判**（`typescript/tokens/statement.xl.md` 的 `Statement.IsLineBreakBoundary`）：
  前一个单元不再要操作数、后一个单元也不能续接 ⇒ 断句，加上 `return` / `throw` / `break` /
  `continue` / `yield` 与后缀 `++` / `--` 的受限产生式。规范里还有一条「**语法不允许时**才插分号」——
  本工程不看完整文法、只看形状，所以极端排版仍可能与 TS 不同，这类情况由 `cases:tsast` 巡检。
- **不看未来**那条铁律：判据只用**已经读到**的东西，所以「成员层」这类没有入口字符的构造
  靠**体自己认边界**（见 [member-layer-plan.md](member-layer-plan.md)）。
- **`Parent` 不变式**（`core/syntax/close-rule.xl.md` 的 `ApplyTo`）：规则用 `ReplaceCountAt`
  换进来的节点**不带 `Parent`**（那是核心的 `splice`），每趟 `Process` 之后就地把新换进的那一小段补齐——
  否则「靠当前单元的父亲认容器」的规则（元组成员、方括号类型…）会判不出容器。
- **正则不能吞代码**：`/` 只有在**本行内能找到配对的 `/`** 时才算正则开头——
  少了这条，JSX 闭合标签 `</div>` 里的 `/` 会把文件余下内容整段吃掉。
- **字符串起点有三种引号**（`"` / `'` / `` ` ``，见 `parse-pipeline.xl.md` 的 `ExtendStringStarts`）：
  少了单引号 / 反引号，`import … from './x'` 里的 `/` 会被正则词法接手。
- **`typeof` 的操作数只到名字为止**（TS 的 EntityName）：类型位那条规则排在方括号之前，
  照面会把 `a[K]` 先收成一个单元 ⇒ `typeof` 吞下整段。所以方括号那一侧要让一趟
  （`type-bracket.xl.md` 的 `IsTypeQueryOperand`），让 `typeof 名字` 先成形。
  `keyof a[K]` 是**反例**（`[]` 绑得更紧），只有 `typeof` 在这个名单里。
- **语言配置带来的差异不是缺陷**：`\a` 解成响铃字符而不是字母 `a`；
  `@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。

## 收缺口的两条规矩

- **一次收一族**：把量出来的那一族整个收掉；量出来的时候**先补用例**（带 `xl:known-gap` 进语料），
  收掉的时候删掉那行指令——只修现场那一条，下一轮换个排版又回来。
- **先探「同族的第三条」**：`do` 的体自带分号那一族、循环头部括号里出现 `)`、
  括号 / 一次调用当被调用者时的可选链、「注释 / 换行落在语法相邻位置之间」，
  都是这么一条一条量出来的。

## 已知仍开着的缺口

**缺口清单长在语料里**（第 670 轮）：每条缺口就是 `tests/parse/cases/` 下的一个用例文件，
文件头带一行 `// xl:known-gap <根因>`。`cases:tsast` 每趟把它们逐条真跑一遍：

- **还对不上** ⇒ 记 `KNOWN`，差额**不算进那七项**（所以 `npm run gates` 可以是绿的）；
- **已经对上了** ⇒ 报「收掉了」并**红**，逼你回来删掉那行指令——清单不许只增不减。

这一趟的结论就是门的那一行输出（`已知缺口：N 条还开着、M 条已经收掉`），
所以「还差多少」在 `npm run gates` 里直接看得见，不必回 `tmp/` 翻探针。

**当前 15 条**（第 668 轮从探针池 `tmp/k7-snips-big.mjs` 的 40 条里收掉 27 条之后剩下的 13 条，
外加两条单独探出来的）：

| 用例 | 形状 | 症状 |
| --- | --- | --- |
| [destr-object-newline-after-keyword.ts](../tests/parse/cases/declarations/destr-object-newline-after-keyword.ts) | `const \n{ a, b: c, d = 1, ...rest } = o` | 换行落在声明关键字与解构模式之间时整条声明解体（缺 11 / 多 15）：`Let` 那一趟与 `{` 都是按「紧邻」找模式的 |
| [decl-declare-function-trailing-comment.ts](../tests/parse/cases/declarations/decl-declare-function-trailing-comment.ts) | `declare function f(): void /* c */ ;` | 无体声明的区间只到自己最后一个实义单元，尾随注释与 `;` 没算进去（TS 的 `FunctionDeclaration` 到 `;` 为止） |
| [expr-function-expression-plus.ts](../tests/parse/cases/expressions/expr-function-expression-plus.ts) | `const r20 = function f() {} + 1` | 函数表达式后面还能接运算符，这里整段收成了别的形状（缺 4） |
| [expr-generic-instantiation.ts](../tests/parse/cases/expressions/expr-generic-instantiation.ts) | `const a = f<string>;` | **泛型实例化表达式**（TS 4.7）没有规则：产物是 `BinaryExpression(f < string)`，TS 是 `ExpressionWithTypeArguments` |
| [stmt-generator-trailing-semicolon.ts](../tests/parse/cases/statements/stmt-generator-trailing-semicolon.ts) | `function* g() { yield* h(); };` | 尾随那个 `;`（空语句）没成壳（缺 1 漂 1 多 1） |
| [stmt-for-comment-before-paren.ts](../tests/parse/cases/statements/stmt-for-comment-before-paren.ts) | `for /* c */ (…)` | 头部取括号只看紧邻那一格 ⇒ 整条 `for` 解体（缺 1 漂 1 多 5） |
| [stmt-switch-comment-fallthrough.ts](../tests/parse/cases/statements/stmt-switch-comment-fallthrough.ts) | `switch /* c */ (a) { case 1: case 2: … }` | 判别括号认不出 ⇒ `case 1:` 那一格整条落空（缺 5 漂 1 多 3） |
| [stmt-label-comment-before-call.ts](../tests/parse/cases/statements/stmt-label-comment-before-call.ts) | `a: b: c: d/* c */ ()` | 标签那一趟看到的是注释，最后一层标签没接上被标的语句（缺 1） |
| [stmt-switch-block-then-default.ts](../tests/parse/cases/statements/stmt-switch-block-then-default.ts) | `switch (1) { case 1: { break; } default: break; }` | 单行写完一个块再跟 `default`：语句层把 `default:` 并进了同一个壳，分段只在顶层单元上找 `case` / `default` ⇒ 只有一段。**换行写法是好的**（见 [README](../README.md) 的「开着的缺口」，块当语句边界的改法已被否决） |
| [stmt-do-while-then-statement.ts](../tests/parse/cases/statements/stmt-do-while-then-statement.ts) | `do {} while (a) b()` | `do…while` 后面还跟着一条语句时那一格没被收（缺 3） |
| [type-param-conditional-constraint.ts](../tests/parse/cases/types/type-param-conditional-constraint.ts) | `x extends A extends B ? C : D` | 约束位上的嵌套条件类型不成形（缺 10 / 字段 1） |
| [type-asserts-toplevel.ts](../tests/parse/cases/types/type-asserts-toplevel.ts) | `type T = asserts x is A` | 断言谓词只在返回类型那一位成形（缺 5 多 2） |
| [type-param-asserts-constraint.ts](../tests/parse/cases/types/type-param-asserts-constraint.ts) | `x extends asserts x is A` | 约束位上的断言谓词不成形（缺 5 多 2） |
| [type-param-template-literal-constraint.ts](../tests/parse/cases/types/type-param-template-literal-constraint.ts) | `` x extends `a${A}b` `` | 约束位上的模板字面量类型不成形（缺 15 多 7，还带一处未映射 `Bracket`） |
| [type-typeof-qualified-index.ts](../tests/parse/cases/types/type-typeof-qualified-index.ts) | `type A = typeof a.b[K]` | 点号名在产物里是平级单元，`TypeQuery` 于是吞下整个 `a.b[K]`（缺 4 漂 2 多 1）。**不带点号的** `typeof a[K]` / `typeof a[]` / `typeof a[K][L]` 第 667 轮已经收掉 |

**怎么收**：改完跑 `node tests/parse/ts-ast.mjs cases` 看那一趟——收掉的那条会印「收掉了」，
把它的 `xl:known-gap` 行删掉、把这条从上面的表里拿掉，门就少一条账。
**探针池仍然有用**：`node tests/parse/ts-ast.mjs --snippets <候选.mjs>` 是先量后收的第一站
（`tmp/` 不进仓库，所以它是**一次普查的现场**，不是门）；量出一条就补一个带 `xl:known-gap` 的用例，
清单与语料一起长。

**已经收掉的那两族**留个对照，说明这类缺口长什么样：

- **第 668 轮**：`while (a)` 换行 `{ … }`、`for (;;)` 换行 `/* c */` 换行 `{ … }`、
  `switch (a)` 换行 `{ … }`、`function f<T>(x: T): T` 换行 `{ … }` —— **声明头与它的体之间那个换行
  不是语句边界**（`Statement.NextLineContinuesExpression` 的 `IsHeaderBodyBrace`）。
  `{` 自己起得了一条语句（裸块），所以判据只能认「末尾是不是一个等着体的头」，
  不能见 `{` 就答「续接」：`foo()` 换行 `{}` 在 TS 里是两条语句。顺带收掉
  `import` 换行 `{ a } from "m"` 的解析崩溃。
- **第 669 轮**：`export /* c */ { a as b }` 与 `export` 换行 `{ a as b }` ——
  `ExportCloseRule` 找子句时只跳软换行、不跳注释，且收集循环的第一格撞上 trivia 就 `break`
  （`SkipWrap` 与那一段收集都改成「还没有收到任何单元时跨过 trivia」）。

## 被否决的改法（不要再试）

1. **`Token.Reorganize` 改成「每条规则重复扫到无改动」**：能让三层以上嵌套三元收敛，
   但它对**所有规则**生效 —— 整批用例一起跑直接 `FATAL ERROR: heap out of memory`。
2. **把 11 个复合赋值符号补进 `IsCombinedSymbol`**：`a ??= 1` 一族内存失控
   （单条 200ms、整份文件 5 秒超时 + 768MB 堆爆）——「切成 `op` + `=` 再克隆左值」
   与「克隆出来的单元又被同一条规则重新处理」叠在一起发散。
3. **`IsMemberSignature` 要求「参数表后紧跟 `:`」+ `BodyIndex` 要求「同行的 `{`」**：两条都是**净回归**
   （把接口里成片的多行重载、一行一条的 `get x(): number` 一起打掉）。
   要修得先能区分「体在下一行」与「下一条成员」——只往前看分不出来。
4. **把语句位上的裸块当语句边界**（`StatementReorganization2.Previous`）：切断了复合赋值的展开，
   **整段内容丢失**，比边界不合严重。
