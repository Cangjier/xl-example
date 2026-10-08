# TypeScript 解析：现状、口径边界与不再试的改法

**这份文件只装「今天还有用」的东西**：口径边界、怎么量缺口、解析层的硬规矩、被证伪的改法。
逐轮的现场（每次的根因、探针、差分读数）在 **git 历史**里，不再往这里堆；
**当前读数只有一份**（README 的「当前状态」表），这里不再抄数字，免得两处各说一套。

## 现状

语料的覆盖面：`node_modules` 的 `@types`、`typescript/lib`、`undici-types`
加本项目的 `dist/ts/**`、`samples`、`tests/parse/cases/**`。
其中**所有真实可达的 TS 构造**都已经对上；`SyntaxKind` 全表与语料的差集只剩
**合成节点**（`Bundle` / `Count` / `SyntaxList` / `Synthetic*` / `NotEmitted*` / `PartiallyEmittedExpression`，
它们不由源码解析产生）与 **JSX 那一族**（见下）。

## 怎么量缺口

0. **先写小片段探针**（第 657 轮起）：`node tests/parse/ts-ast.mjs --snippets <文件.mjs>`
   在**一个进程**里把几百条一两行的片段逐条与 `ts.createSourceFile` 对拍（`{ id, src }` 的数组，
   TS 自己非法的片段跳过、产物抛异常的片段报 `CRASH` 而不会打断整轮）。
   `--file` 是一份文件一个进程，量小片段时进程启动就是全部成本——普查一律走这一条。
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
- **语言配置带来的差异不是缺陷**：`\a` 解成响铃字符而不是字母 `a`；
  `@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。

## 已经量出来、还没收的族（第 657 轮普查）

普查口径：1510 条**合法**片段（手写 377 + 定向变体 98 + 「每个 token 边界插一遍 `/*c*/` / 换行」1035），
**296 条形状对不上（138 种签名）、6 条让产物抛异常**。根因只有三处，都值得单独收：

- **(a) 注释 / 换行落在语法相邻位置之间**（占绝大多数）：关键字与名字（`let \na = 1;`）、
  修饰词与成员（`private /*c*/ m() {}`）、运算符与操作数（`-/*c*/ a`）、头与体（`function f()\n{…}`）、
  `export` 与声明（`export /*c*/ const a = 1;`）、`else` 与 `if` 的取词、解构元素与注释。
  **第 660 / 661 / 662 轮各收几支**。660：`let` / `const` / `var` / `using` 的声明头（关键词 / 修饰词 /
  名字 / `!` 与 `:` 之间夹注释 ⇒ `LetBranch` 的三处往回走从「只跳软换行」改成跳全部 trivia，
  头里那些注释按 `CommentsIn` 收到 `Let` 右边不丢）、以及解构元素**段首**的注释
  （`BindingElement` 的 `SignIn` 从第一个非注释单元起签，注释照旧进 `Data`、不撑区间）。
  661：类型别名头（`TypeAssignCloseRule.Previous` 与 `Process` 的 `type` + 名字 + `=` 三格）、
  函数声明头（`FunctionCloseRule.ParameterIndex` 与 `Process` 的 `function` + `*` + 名字 + 形参表，
  关键词与名字之间的注释按 `CommentsIn` 收进 `Function`）、标签
  （`LabelCloseRule` 的名字 + 冒号 + 被标语句三格；名字与冒号之间的注释收在 `Label` 左边 ——
  放右边会把「`{` 前面是标签」那条相邻判断挡掉，块于是被当成对象字面量）、
  以及 `IsObjectLiteralBrace` 里标签冒号往回那两格（`block /* c */: { … }` 的体散架）。
  662：四个循环体的**体起点**（`while` / `for` / `foreach` / `do…while` 各一处从只跳软换行改成跳 trivia）
  ——`while (a) /* c */;` 原来判不出空体（`EmptyBodyAt` 记不下、投影画不出 `EmptyStatement`）、
  `while (a) /* c */ {}` 也记不下 `BodyBrace`；头与体之间那些注释按 `CommentsIn` 收进体段不丢。
  剩下的最小片段照旧按族留在 `tmp/` 的探针集合里（不进仓库）。
- **(b) 空语句 `;`**：**第 663 轮收完**（`if (a) {} ;` 一族的三条崩溃、`while` / `for` /
  `function` / `class` / `switch` / `try` / 裸块后面那个 `;` 缺 `EmptyStatement`、
  `;;` 那一格上一条语句多一格）。三个落点：`IfSet` 的尾巴把 `;` 交还宿主；
  `Statement.SplitShell` 拆「壳里只剩一格语句级单元、而壳的区间还长着」那种壳，
  把被吞掉的尾分号还原成一条空语句；投影侧按 kind（`NO_TRAILING_SEMICOLON`）判那个 `;`
  归上一条还是自成一条。**反面同样钉住了**：导入断言 / 环境签名后面那个 `;`
  是声明自己的终结符（`stmt-semicolon-*` 三份 + `decl-ambient-signature-semicolon`）。
- **(c) 少数构造在组合下整节点丢失**：**第 664 轮收掉两支** ——
  **可选链 × `as` / `satisfies`**（`?.` 后面的 `as` / `satisfies` 是断点，链不再把它吞进去；
  折断言那一支还要让开 0a0 / 0a 两条 NCO 支路），
  **`f!(1)` 的实参**（非空断言当被调用者时，那一对括号是这次调用自己的实参表、
  不是被调用者）。用例 `expr-optional-chain-as` / `expr-nonnull-call-arguments`。
  还剩：泛型实例化表达式 `f<string>`、`async<T>(x) => x`、`get /*c*/ x()` 存取器、
  简写环境模块 `declare module "mm";`。
- **(d) 裸块里那一格也要成语句**（第 665 轮）：`{ A };` 里 `A` 后面既没有 `;` 也没有换行
  ⇒ `FormFrom` / `StatementBranch` 两档都不响 ⇒ 块里那一格从来没有壳。
  `Statement.FormTail` 的白名单补上「不是对象字面量的 `{}`」（判据与 `FormFrom` 那一格同一句）。
  用例 `stmt-bare-block-bare-expression`。

**收的时候一次收一族**（上面 (a) 里每一小项都是独立的一族），并把它写成 `tests/parse/cases/` 下的用例——
用例进了语料，`cases:tsast` 才会一直替它把关。

## 已知仍开着的缺口

只剩一条，是**探针量出来的**（`tmp/` 里那种一次一条的小片段，见「怎么量缺口」第 4 条），
**不在语料里**——所以 `npm run gates` 是绿的，而它是真实存在的形状：

- **`switch` 体里同一行写完一个块，后面再跟 `case` / `default`**：
  `switch (1) { case 1: { break; } default: break; }`。语句层把 `default:` 那一截并进了
  **同一个 `Statement` 壳**，而 `switch` 的分段是在体括号的**顶层单元**上找 `case` / `default`
  （`switch.xl.md` 的 `SegmentWordOf`）——壳只有一个，于是只有一段，`default` 整条落进前一段的
  `SwitchStatement`。**换行写法是好的**，所以只有单行 / 压缩过的代码中招。
  同族的那条「块后面紧跟着表达式」在 [README](../README.md) 的「开着的缺口」里，改法已被否决过
  （块当语句边界会切断复合赋值的展开），这一条要修得先能区分「块 + `case`」与「块 + 操作数」。
修好的形状不在这里留名（在 git 历史与用例里），只有一条经验值得留着：
**先探这一类「同族的第三条」**——`do` 的体自带分号那一族、循环头部括号里出现 `)`、
括号 / 一次调用当被调用者时的可选链、注释夹在语法相邻位置之间，都是这么一条一条量出来的。

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
