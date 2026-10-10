# TypeScript 解析：现状、口径边界与不再试的改法

**这份文件只装「今天还有用」的东西**：口径边界、怎么量缺口、解析层的硬规矩、被证伪的改法。
逐轮的现场（每次的根因、探针、差分读数）在 **git 历史**里，不再往这里堆；
**当前读数只有一份**（根 [README](../../README.md) 的「当前状态」表），这里不再抄数字，免得两处各说一套。

## 现状

`cases:tsast` 的语料（`node_modules` 的 `@types` / `typescript/lib` / `undici-types`
加本项目的 `dist/ts/**`、`samples`、`tests/cases/token/**`）**逐文件全绿**——
四方向（缺 / 漂移 / 多出来 / 字段名）与三栏地基（未映射 / 缺 range / 区间越界）全为 0，
**抛异常 0**。`SyntaxKind` 全表与语料的差集只剩**合成节点**
（`Bundle` / `Count` / `SyntaxList` / `Synthetic*` / `NotEmitted*` / `PartiallyEmittedExpression`，
它们不由源码解析产生）与 **JSX 那一族**（见下）。

**但「语料全绿」不等于「构造全对」**：上面那一趟**不含**登记了缺口的用例
（`xl:known-gap` 登记的那些走另一条账，见「已知仍开着的缺口」）。
所以量缺口要另外两条路：**片段探针**与**语料里的缺口账**。

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
3. **加宽语料之前先普查**（`npm run coverage:sweep -- <候选.mjs>`）：候选的形状与
   `tests/cases/**` 里的用例一样（`{ id, title, src }` 数组，导出的名字当层名用），
   但**不写读数、不看台账、不红**——拿 `run.mjs` 去试会得到一片红，
   红里混着「真坏了」与「本来就还没做」。
4. **搜缺口要写小片段探针**（一条一个构造、同进程对拍）：一条片段一次就翻出一处真缺口，
   比读大文件快得多。

## 口径边界（**明确不做**，不是缺口）

| 边 | 为什么 |
| --- | --- |
| **JSX / TSX** | 独立于 TypeScript 的语法扩展，不在 `.ts` 范围内。四个 `.tsx` 用例只钉住「不抛异常 / 不吞掉后面的代码」 |
| **`Object.freeze` 之后写属性 / 只读访问器上赋值** | 本仓一律抛（**严格模式**的选择）；`node` 把 `.ts` 当 CJS 跑是松散模式、静默失败 |
| **装饰器的运行期语义** | 三种 `node` 模式（类型剥离 / 变换 / `--experimental-strip-types`）都在 `@tag` 那一行报语法错，**裁判给不出来**——没有基准就量不了。装饰器本身是**待做项** |
| **`xl:ts-invalid` 的 9 份** | 故意写非法 TS（未终止的块注释 / 模板 / 字符串 / 正则、`@'…'` 逐字字符串前缀、`#if` 预处理）。判据要量的正是**错误处理**，而对拍的前提是对面能解析出来 |

**不在这张表里的都是缺口**（进分母、记在台账或 `xl:known-gap` 里）：
`RegExp` / `BigInt` / 多文件模块加载 / 动态 `import()` / `console.log(new Error(…))` 的栈
——用户口径（第 685 轮）：**这些都要做**，`tsrun` 现在的单文件口径是**现状**，不是口径。

## 解析层几条硬规矩

- **ASI 按形状预判**（`typescript/tokens/statement.xl.md` 的 `Statement.IsLineBreakBoundary`）：
  前一个单元不再要操作数、后一个单元也不能续接 ⇒ 断句，加上 `return` / `throw` / `break` /
  `continue` / `yield` 与后缀 `++` / `--` 的受限产生式。规范里还有一条「**语法不允许时**才插分号」——
  本工程不看完整文法、只看形状，所以极端排版仍可能与 TS 不同，这类情况由 `cases:tsast` 巡检。
- **不看未来**那条铁律：判据只用**已经读到**的东西，所以「成员层」这类没有入口字符的构造
  靠**体自己认边界**（见 [member-layer-plan.md](../../docs/member-layer-plan.md)）。
- **判据跨过 trivia，搬的那一段也必须跨**（第 816 轮）：`CloseRule` 的 `Previous` 与 `Process`
  是两处独立的「找操作数」——`Previous` 走 `SkipNextTrivia`（注释也算 trivia）、
  `Process` 走 `SkipNextWrapSymbol`（只跳软换行）时，两者**指的不是同一个单元**：
  节点收下的那个「操作数」其实是注释，真正的操作数留在节点外面，区间也停在注释末尾。
  实测 `type K = keyof /* c */ T;` 一族 8 条（`gap-r676-{keyof,typeof,readonly,unique}-comment-operand`
  与 `mut-type-mapped-template-key-94/95`、`mut-type-union-after-readonly-103/104`）同一个根，
  改法只有一处（`type-operator.xl.md` 的 `Process` 也走 `SkipNextTrivia`），注释由
  `ReplaceCountAt` 跟着搬进节点、不投影成节点，所以不多出东西。**新写 `Previous` / `Process` 时
  把这两处的「下一个实义单元」对齐**，别各跳各的。
- **「相邻的那一格」一律走 trivia 口径**（第 817 轮，同一条线的第二面）：判 x 与 y 相邻时，
  中间夹一条注释与夹一个软换行**是同一件事**（`IsTriviaUnit` 那份名单就是「不该挡住相邻判断」的单元）。
  这一轮把五处「只看紧邻」的判据改成跨 trivia，一次收掉 23 条：`FunctionTypeCloseRule` 往左找形参括号、
  `MethodDeclarationCloseRule.ParameterIndex` 往右找 `(`、`SignatureCloseRule.Previous` 往左找方法名
  （这一处只能用 `SkipPreviousAnnotation`——**软换行在成员体里是边界，不能跳**）、
  `MethodCloseRule.NameIndex` 往左找被调用者、`BinaryOperatorCloseRule` 判「`,` 是不是逗号表达式」时
  往左看括号外面那一格。**判据只差一个 `Skip*` 的时候，先问「注释与换行在这里是不是同一个意思」**：
  是就一起跳，不是就只用 `Skip*Annotation`。
- **二元运算符两侧那两格也是这一条**（第 872 轮，第五面）：`binary-operator.xl.md` 的 `Previous`
  判「左右两边都是操作数」、`Process` 取 `beforeIndex` / `afterIndex`，原来一律
  `SkipPreviousWrapSymbol` / `SkipNextWrapSymbol`——`1 /*c*/ << 2` 与 `1 << /*c*/ 2` 于是
  **两半各缺一格**（左操作数 / 右操作数取到的是那条 `AreaAnnotation`）。改法照旧**成对**：
  `Previous` 的判据与 `Process` 的搬运一起换，同一条线上的四处链走法
  （NCO 链 / `as` 基名 / `PropertyAccess` 链 / `**` 右结合）一起换。
  **症状不会落在语句层**：`Statement` 把整段平列表交给 `projectExpression`、投影自己会折，
  所以只有「只投一格」的地方（枚举成员的初始值）才显形——**一处折不出来，别处看不出来**。
- **「头还没写完」那一族又量出两格**（第 873 轮）：`const s:` 换行 `string = ""` 与
  `unique` 换行 `symbol` 都是**一条**声明，判据分别叫 `IsVariableTypeAnnotationColon`
  与 `IsPendingTypeModifier`（都住 [text-common-util.xl.md](../../typescript/text-common-util.xl.md) /
  [statement.xl.md](../../typescript/tokens/statement.xl.md)）。两条合起来的教训是前几轮那两条的重演：
  **判据要问「那个单元现在成形了吗」**——`const` / `let` / `var` 到这一刻已经折进 `Let` 的字段里，
  按**词**判一次都不响（`Let` 那一格）；而「类型词收尾」必须先证明**它自己在类型位**
  （`:` 或 `=` 右边），否则一个叫 `unique` 的变量独占一行也会被判成续接。
  同一件事在解析期（`LineCannotEnd`）与收尾期（`IsLineBreakBoundary` / `AliasEnd`）各写一遍就会漂，
  所以 `IsPendingTypeModifier` **只写一份**、两处都问它。
- **「在哪一层找那个东西」也是判据的一部分**（第 877 轮）：`export { a }` 换行 `from("m")`
  的模块路径**不在** `Export` 的本层——`MethodCloseRule` 先把 `from("m")` 收成了一个
  `Method(name="from")`，字符串在**它里面**（`Method` 的字典把实参表摊平成 `children`，
  所以子节点里连 `Bracket` 都没有，`allKids` 给的就是那个 `String`）。
  找进去一层时**只认 `Method`**，别写成一律递归——`export { "a-b" as c }` 的字符串名就在
  具名子句的**花括号里**，那是 `ExportSpecifier` 的名字（第一版一律递归，
  `mod-export-string-name` 当场红：字段名差 1）。
  那一格在 TS 那边是 `ParenthesizedExpression`，区间是 `[左括号, 字符串末尾)`
  （**不含右括号**；`endOf` 在这一层给闭右端 ⇒ 要 `+1`）。
  **两个形状坑**：① `projectableKids(view(x))` 是错的（视图再 `view` 一次 ⇒
  `k instanceof Map` 全为假）——要子节点用 `allKids(view(x))`；② `Method.ParameterIndex` 那类
  「名字 + 形参表」的产物会把括号摊平，别指望在子节点里找到那个 `Bracket`。
- **「这一段写完了没有」有两半，左边那一半看不出来时问右边**（第 876 轮）：
  `export { a }` 换行 `from "m"` 里花括号子句到手那一刻 `IsComplete` 就答「写完了」
  （`from` 对花括号子句是**可选**的 —— `export { a };` 本来就是完整声明），
  可下一行那个 `from` 说明它还没写完。换行那一刻 `from` 还没读进来 ⇒ 判据只能落在
  **原始字符**上（`text-common-util.xl.md` 的 `NextLineStartsWithWord` / `NextLineFirstCharAt`
  / `SkipSourceTriviaFrom`）。**两处必须问同一句**：语句壳那一侧
  （`Statement.IsPendingExportHead`）与收尾规则那一侧（`ExportCloseRule.Process`）——
  只改后者的症状是「`Export` 区间对了、`From` 与路径还在外面」（实测）。
  **共用的一格要放在两者共同的下层**：`export.xl.md` 反过来被 `statement.xl.md` import
  （`export_1` 那一格），所以这三格住在 `text-common-util.xl.md`，`Statement` 那两格只是转发。
  **两个踩过的坑**：① `Process` 里可能有**同名的外层 `i`**（`isPrefixOnly` 那一支用过它）——
  新建 `Source` 要取 `unit.SourceRange.Start.Index`，不要用 `i`；② 判据的**返回值方向**
  要对着 `if` 读一遍（`IsPendingImportHead` 里 `LineEndsWithEquals(data) === false` 是写反的，
  本轮顺手改对了，但那条缺口的收尾规则那一侧仍然先收壳）。
- **同一个「左边那一格」的判据，在解析期（开括号那一刻）与收尾期各有一份**（第 875 轮）：
  `import` / `export` 后面那个 `type` 词是不是**引入一个子句**（`import type { A }`）而不是
  类型别名（`export type X = { … }`），要在**两处**问——`DecideBracketContext` 在开括号那一刻
  （括号还没进 `units`，「后面什么都没有」就是它的答案）、`TypeLiteralCloseRule.IsTypePosition`
  在收尾期回扫（括号已经在 `units` 里，要问「后面那一格是不是那个 `{`」）。
  两处**都必须跨 trivia**，而且**只能有一份实现**：`IsImportExportTypeClauseBrace`
  （`text-common-util.xl.md`，第三个参数就是这两种形态的差别）。
  **症状是「一个 `{` 被收成 `TypeLiteral`」**：`import /*c*/ type { A }` 里导入列表整段不见、
  里面每个名字成一个 `Field`——**AST 那边一个属性都没有**。
- **位置答案不许有第二份**（第 875 轮，同一条线的另一面）：`ImportClause` 的起点原来是
  `ctx.FirstCodeAfter(source, import + 6)`——**回原文跳空白**，可 `import /*c*/ type { A }` 里
  它先命中的是那条注释 ⇒ 区间从 `/*c*/` 起。规矩与 `NamedBraceAt` 同款：
  **认下那一格的那一刻就把下标记进字段**（`Import.TypeWordAt`），投影从字段读、字段缺失才回原文找。
  **新增字段要记得放进 `ToDictionary`**（投影读的是字典；`ToXmlString` 不是它的出口，
  这也正好让 XML 一个字节都不动）。
- **`i ± 1` 是这一族的口味标志**（第 828 轮，第 817 轮那条线的第三面）：判「上一格 / 下一格是不是
  我这一族的东西」时，下标**不许写成 `i ± 1`**——要走 `SkipPreviousTrivia` / `SkipNextTrivia`。
  第 817 轮是「哪几处判据只差一个 `Skip*`」**点着名**改的（五处），而**同型的循环**没人一起过一遍；
  第 828 轮按这条线又量出**四处**，一次收掉 11 条：
  - `OptionalCallCloseRule.CalleeStart`（原来读 `Get(units, start - 1)`，第二问判点号还读 `start - 2`）：
    `a/*c*/?.b?.[c]?.(d)` 往左走到注释上就停 ⇒ 被调者链只剩三个 `NullConditionalOperator`、
    `name` 空着、`a` 留在 `Method` 外面（缺 9 个节点：`CallExpression` / `PropertyAccessExpression` /
    `ElementAccessExpression` + 三个 `Identifier`）；
  - `SpreadCloseRule` 的 `IsOperand(SkipNextWrapSymbol(...))`：`{ .../*c*/ { a: 1 } }` 里注释不是操作数
    ⇒ 那条 `Spread` **完全不成形**（`Previous` 判不下、`Process` 也搬不进来）；
  - `UnaryOperatorCloseRule` 的前缀入口（`-/*c*/ a` / `!/*c*/ a`）与后缀入口（`a /*c*/ ++`）。
  **`Previous` 与 `Process` 必须成对改**（第 816 轮）：只改前者会让节点「判得下却搬不进来」，
  只改后者会让它「根本轮不到」——四处都是成对改的。
  **症状不会落在 `cases:tags` 上**：注释本来就在 token 树里（`INVISIBLE` 管的是**投影**）——
  收掉的 11 条自带的 `xl:expect` 一个字都不用改，红只在 `cases:tsast` 那一侧。
- **「头还没写完 ⇒ 换行不是语句边界」要按声明自己的收尾形状判，不能照抄隔壁那一族**（第 869 轮）：
  第 829 轮给导入声明加的 `Statement.IsPendingImportHead` 只用一条判据——「段里还没有 `String`」，
  因为导入**一定**以模块路径收尾。导出声明不是：`export { a }` 不带 `from` 自己就完整，
  `export * as ns` 必须等到 `from "m"`，`export =` / `export default` 要等操作数
  ⇒ 照抄「有没有路径」要么把下一行吞进来、要么半截收壳。
  所以第 869 轮那一格走的是**收尾规则里那一份 `ExportCloseRule.IsComplete`**
  （四种收尾形状分三支），`Statement.IsPendingExportHead` 只做「段首是不是真的导出声明头」这一步。
  **判据只写一份**：同一件事在两处各写一个近似，早晚会漂。
  **下次动 trivia 口径，按「有循环 + 判相邻」去搜一遍**，别只改这一轮量到的那几处。
- **「后面必须跟一个语句体」的词也是同一档**（第 828 轮，第 820 / 822 轮那条线的第四格）：
  `Statement.ExpectsOperand` 那张表原来的口径是「**这个词能不能结束一条语句**」——
  `let` / `const` / `var`（第 820 轮）与 `function` / `class` / `interface` / `enum`（第 822 轮）
  都按这一条进去。第 828 轮补的是**后面必须跟一个语句体**的四个词：`try` / `do` / `else` / `finally`。
  `try` 换行 `{ … } catch (e) { … }` 在 TS 里是**一条** `TryStatement`（换行只是排版），
  少了这一格 `LineCannotEnd` 在换行那一刻收壳 ⇒ `try` 自己成一条 `ExpressionStatement(Keyword)`、
  `catch` 另起一条、整条 `TryStatement` 与两个 `Block` / `CatchClause` 全丢
  （实测 `gap-sweep-{newline,linecomment}-try-01`：各缺 8 条、多 4 条）。
  **`while` / `for` 不跟它们一起**：那两个词后面跟的是**括号**，`while` 换行 `(cond) { … }`
  由 `FieldCloseRule.MemberEnd` 那条「下一行以 `(` 开头」的判据管（第 827 轮），
  而 `try` / `do` / `else` / `finally` 后面跟的是**语句体本身**。
  **加词之前先问「这个词能不能单独成句」**——这是这张表唯一的入表条件。
  **第 835 轮把 `for` / `while` / `switch` 补了回去**：上面那句「由『下一行以 `(` 开头』管」
  只在**括号真的在下一行**时成立，而标签头会把换行提前 —— `lbl: for` 换行 `(;;) { … }`
  死在 `for` 那一格（`(` 还没读到）⇒ `LabeledStatement` 只盖住标签（实测
  `gap-sweep-{newline,linecomment}-label-02`）。判别括号对这三个词是**语法上不可省**的一段，
  与「后面必须跟一个语句体」是同一档。**不会误伤成员名**：`obj.for` / `a.while`
  由「点号后面是成员名」那一问挡着（与 `default` / `new` 同一档）。
- **上下文关键字只在「后面确实跟着要被修饰的东西」时升级**（第 848 轮，第 842 轮那条线的第二格）：
  `declare` / `abstract` 与 `async` / `override` 同一档（`keyword.xl.md` 的 `Keyword.IsUpgradable`）。
  `abstract` 换行 `class A {}` / `declare` 换行 `module "m" {}` / `declare;` 在 TS 那边那个词
  都是**普通 `Identifier`**（语句层已经按 ASI 把它收成单独一条壳）⇒ 不升级；
  而同行写的 `abstract class A {}` / `declare module "m" {}` 后面那个词就在同一个壳里。
  **判据看后一个实义单元**：Identifier / 关键字 / 引号名 / **`New` 单元**
  （`interface I { abstract new (): A }` 里跟的就是整条 `new (): A`）这一档才算
  「后面有个东西」，`;` 与「什么都没有」都不算。
  **改这一条要跑全语料**：第一版漏了 `New` 那一格，`decl-interface-abstract-construct-signature`
  当场从 `Keyword` 掉成 0 个。
- **「第一个」是「第一个实义单元」**（第 849 轮）：`IsTypePosition` 入口那句
  「括号里的**第一个** `{`」原来写的是 `index === 0`，而 `(/* c */{ … } | { … })` 里
  注释在本层占了一格 ⇒ 那一支整条跳过 ⇒ 回扫撞上 `(` ⇒ 按值位判（保守）⇒
  同一个联合类型里第一个是 `ObjectLiteral`、第二个靠 `|` 判对。
  **凡是「列表开头那一格」的判据，都要问「跳过 trivia 之后还有没有东西」**
  （`SkipPreviousTrivia(units, index) < 0` 就是「没有」）——与 `IsBindingPatternBrace` /
  `IsObjectLiteralBrace` 那两处同一口径。
- **「体的第一个单元」不许是 trivia**（第 847 轮）：`if` 的体是**向导自己挂**的
  （`IfSegment.Process` → `MountBodyOrStatement`：`{` ⇒ `IfBody`、其余 ⇒ 单语句体），
  所以注释一到就会被当成体的开头 —— `if (a) /*c*/{ b(); } else { c(); }` 里
  `{ b(); }` 成了体**内部**的括号、`else` 被一起吞掉（带 `else` 才显形：不带时
  「体内容只有一个花括号块」正好投影成 `Block`，缺口就藏在那里）。判据落在
  `if-set.xl.md` 的两个新方法上：`IsCommentStart`（`/` 后面那一格是 `*` / `/` ——
  **正则也以 `/` 开头、而它是体的第一个单元**，所以只有注释那一档让路）与
  `IsPendingCommentTail`（第二个字符到了就交给队列，注释分支会把那个 `/` 收回去）；
  `else` 那一侧还有一格：「`else` + trivia」要**当场**把段签在 `else` 上，
  否则注释读完时 `else` 已不是尾巴上最后一个实义单元 ⇒ 整段连体一起丢。
- **`Lex` 不是哪里都能用**（第 847 轮踩出来的）：`Lex` 把新单元挂到 `this` 上，
  而符号分支的 `Success` 走 `AddAndCloseLast` ⇒ 只要 `this` 的**最后一个子单元还没签出**
  就当场抛 `SourceException: SourceRange.Start == null || SourceRange.End == null`
  （整份文件解析失败）。体的位置正是这种局面（最后一格是还没签出的 `IfSegment`），
  改法是 `LexInto(host, …)`：**同一个队列、换一个宿主**，挂到那一段上。
  **新写「把字符丢回队列」这一类判据时，先问一句「这一级的最后一格签出了没有」。**
- **解析期那一问只看得见左边**（第 835 轮）：`Statement.LineCannotEnd` 与
  `LabelCloseRule.IsPendingLabelHead` 都是**解析期**的判据，那一刻 `Data` 里只有
  **已经读到的**单元 —— 同一行后面的东西还没进来（`SkipNextTrivia(data, i)` 会落到
  `data.length` 上、`Get` 给 `null`）。**别把收尾期那一问原样搬过来**（探针实测：
  第一版 `IsPendingLabelHead` 里复用了收尾期的 `StatementStartsHere`，恒为假）。
  与第 820 / 822 / 828 轮那条「头还没写完 ⇒ 换行不是边界」是同一族
  （`IsPendingImportHead` / `IsPendingDecoratorHead` / 本轮的 `IsPendingLabelHead`）：
  判据**只用左边**，右边那一格如果是续接符，`Condition` 里后面那两条本来就不收壳。
- **形状判据别写成「只有某一族才有」**（第 837 轮）：`Statement.IsUnfinishedConditionalType`
  （第 581 轮）的形状是「顶层有一个 `?`、而它的 `:` 还没写」，可那一版**另外要求一个 `extends`**
  —— 那是那一轮量到的样本（条件类型）带进来的副产品。样本里没出现的那一族（**三元**）
  于是被一起挡在门外，而**症状长得完全不一样**：条件类型那边是「缺一个类型节点」，
  三元这边是**整条语句分家**（`const x = a ? b :` 换行 `c;` 变成 `[a, ?, b, :]` + `[c;]`
  两个壳，产物 `[0,17)` vs TS `[0,21)`）。第 837 轮把它改成 `IsUnfinishedQuestionColon`
  （只问 `?` 与它的 `:`），`cond` 那一族收掉 2 条。
  **写形状判据时先问一句「这一族与那一族在这些格子上真的不同吗」**：只有真的不同才加条件，
  否则加的就是一条「只对当轮样本成立」的判据。
- **「这里装的是语句吗」是收壳的唯一前提**（第 836 轮，第 515 / 556 / 583 轮那条线的第四格）：
  `Statement` 壳只该收在**语句列表**里。已经排掉四处：`[` / `(` 括号（第 515 轮）、
  泛型实参段 `< … >`（第 583 轮）、值位花括号与绑定模式（第 556 / 825 轮）、
  以及本轮的**模板串内插段 `${ … }`**。四处都是同一个理由——里面装的是**表达式 / 类型 / 成员**，
  软换行只是排版。**每加一处都要两处成形器一起改**（`FormFrom` 的 `;` 那一档与
  `Condition` 的换行那一档），只改一处就只剩一种排版是绿的。
  实测账：`${b` 换行 `}` 里壳一收下去，投影就多一个 `ExpressionStatement`
  （`EXTRA ExpressionStatement [14,15) «b»`）；`${//c` 换行 `b}` 那一版更绕——
  注释先成壳 ⇒ 内插段里出现 `[Statement, Identifier]` ⇒ `templateSpans` 整段投不出来。
- **「有没有内容」也要用 trivia 口径**（第 818 轮）：`IsTriviaUnit` 不只是「跳过」用的名单，
  也是**判空**用的名单。`m(/*c*/) { … }` 括号里只有一个 `AreaAnnotation`，照
  「不是软换行就算内容」判 ⇒ 收下一张空形参表、再包出一个**零宽的 `Parameter`**
  （实测 `EXTRA Parameter [x,x)` 加 `FIELD MethodDeclaration` 多一个 `parameters`）。
  两处判空都改成 `IsTriviaUnit`（`parameter.xl.md` 的 `Previous` / `AppendSegment`、
  `lamda.xl.md` 造 `LamdaParameters` 那一段），一次收掉 12 条。
  **`AppendSegment` 那一侧还要把注释推回 `rebuilt`**：落在被替换区间里的注释要么显式收下、
  要么推回去，直接 `return` 等于把它从产物里删掉。
- **行注释吃掉它后面那个换行，块注释不吃**（第 819 轮）：`public static //c` 换行
  `readonly a = 1;` 里，那个换行是**注释的一部分**（TypeScript 的 trailing trivia 把 `//`
  到行尾连同换行一起收走）⇒ `static` 与 `readonly` 之间**没有换行**、是同一条成员。
  这与「注释与软换行在相邻判定里是同一件事」（第 817 / 818 轮）**不是同一条**：
  那里注释不挡相邻，这里注释**改变**了换行的存在。所以「换行算不算边界」的判据
  （`FieldCloseRule.MemberEnd`、`ClassMember.Process`）要先看**紧挨在换行前面那一格
  是不是 `LineAnnotation`** ——是就整条边界判据跳过；判据只看行注释那一格，
  不用 `IsAnnotationUnit` 那张整表（块注释后面那个换行照旧是边界）。
  同一轮还带回一条：**成员尾巴**要在乎「最后一个非注释单元」，
  而不是「换行下标 - 1」（`a = 1//c` 换行 `;` 里，那个 `;` 属于这条成员）。
- **声明头那三个词后面必须跟名字**（第 820 轮）：`let` / `const` / `var` 出现在换行前时，
  那一行**一定没写完**（它们没有「单独成句」那种写法，保留字也不可能是属性名 / 成员名）
  ⇒ 三个都在 `Statement.ExpectsOperand` 的词表里，`StatementBranch` 的 `LineCannotEnd`
  于是不在 `const` 换行 `a = 1;` 上收壳。**但 `as const` 要挡**：`x as const` 换行 `;`
  是**写完了**的一条语句——两者词形一样，分开只看**前一个实义单元**是不是 `as`
  （所以 `ExpectsOperand` 多收一个 `before` 参数）。少了后半条，
  `stmt-asi-as-const-then-statement` 当场从绿变红。
- **声明头的词族都「必须跟名字」，不止那三个**（第 822 轮）：`function` 换行 `f() { … }`
  与 `const` 换行 `a = 1;` 是**同一件事**（TypeScript 的换行只是排版），
  所以 `function` / `class` / `interface` / `enum` 也在 `Statement.ExpectsOperand` 的词表里。
  少了它们时症状与第 820 轮那一族一字不差（`StatementBranch` 的 `LineCannotEnd` 在换行那一刻
  收壳 ⇒ 整条声明解体），实测收掉 `gap-sweep-{newline,linecomment}-{fn,generic,async}-*` 六条。
  **判据是「这个词能不能结束一条语句」**，不是「它是不是保留字」：`as` / `default` / `new`
  这些词在别的位置上是名字，只有 `function` / `class` / `interface` / `enum` 与
  `let` / `const` / `var` 这一档**语法上不可能单独成句**。
- **换行后面只有一条注释或一个 `;` 的不算成员边界**（第 820 轮，`MemberEnd` /
  `ClassMember.Process`）：`a: number` 换行 `;` 里那个 `;` 属于**这条**成员，
  而不是下一条成员的开始；`a = 1` 换行 `//c` 换行 `;` 两半连着看才判得对。
- **解析期那一问只看原始字符时，先问「这个字符能不能起一条语句」**（第 824 轮）：
  `Statement.NextLineContinuesExpression` 是 ASI 右半截的**解析期版本**（那时下一个单元还没读进来，
  只能在 `source.Document` 上跳空白与注释、看下一行的第一个实义字符）。
  **起不了一条语句的字符直接答「续接」，且不必配护栏**——`|` / `&` / `.` / `?` / `:` / `=` 都是这一档
  （`const a` 换行 `= [1, 2, 3];` 是一条声明；第 824 轮补上 `=`，一次收掉 22 条）。
  **能起一条语句的字符才要护栏**：`(` / `[`（括号表达式 / 数组字面量）、`+` / `-`（一元前缀）、
  模板串、正则——第 568 轮把整张续接表搬进解析期，翻车就翻在这一档上（13 份用例抛异常）。
- **「收到断点为止」收的是属于这一格的单元，不是断点之前的全部**（第 823 轮）：
  `NullConditionalOperatorCloseRule.Process` 的 `count` 按「断点下标 - 起点下标 - 1」算，
  而断点常常落在**后一个 `?.`** 上（`a?.b //c` 换行 `?.[c]` 里那个换行不是语句边界）
  ⇒ 尾随的注释与换行被一起收进这一格，区间盖住它们
  （实测 `PropertyAccessExpression` 给 `[10,18)` 而 TS 是 `[10,14)`，另多一个节点）。
  改法是从尾巴往回缩到「最后一个实义单元」（`IsTriviaUnit`）为止，trivia 留在外层列表里
  ——**注释照旧出现在产物里**，只是不再属于这一格。
  这一条与第 816 轮那条方向相反：那里说的是**中间**的 trivia「判据跨了、搬运也要跨」，
  这里说的是**尾巴**上的 trivia「谁都不该收」。
- **「起不了一条语句的字符直接答续接」的另一半：能起一条语句的必须问左边**（第 825 轮）：
  第 824 轮那条只说了一半（`|` / `&` / `.` / `?` / `:` / `=` 这一档不必配护栏）。
  `extends` 与 `catch` / `finally` 同档（保留字，起不了一条语句），所以 `function f<T` 换行
  `extends U>(…)` 直接答续接；而 `<` 与 `(` **能**起一条语句（尖括号断言 `<T>x`、括号表达式），
  只能问**左边那一段是什么构造**——「段首是声明词 + 末尾是名字」就算声明头
  （`Statement.IsDeclarationHeadAwaitingParameters`，名字后面允许已经有一个类型参数段）。
  `:` 那一格更细：`case 1:` / `default:` / `label:` 都以 `:` 收尾，所以「见 `:` 就判没写完」不行，
  认回来靠「`:` 前面是一个收好的形参表 `)` **并且**段首是 `function`」
  （`Statement.IsFunctionHeadReturnColon`）。
- **「注释与换行是同一件事」在语料上有个陷阱：前面那些 `// xl:…` 注释各是一层 `Statement`**
  （第 825 轮实测）：`HasTypeColonBefore` 撞上**前面任何一条已经成形的语句**就答「上一行到此为止」，
  于是 `function f<T extends U>` 换行 `(x: T): T { … }` 被判成语句边界——**把用例前面那几行
  指令注释删掉就正好绿**。凡是「往回扫到边界为止」的判据，都要想到语料自己前面那几层注释壳；
  要么先认构造（像这一轮的 `(` 那一格），要么把口径收窄到「只扫当前这一条声明」。
- **类型参数段的折行闸门不要放宽成「下一格是字母就放行」**（第 825 轮）：
  `generic-type.xl.md` 的 `ScanArguments` 原来只认「下一个实义字符是 `>` / `|` / `&` / `:` / `?`」，
  而声明头的折行（`<T` 换行 `extends U>`、`<T extends` 换行 `U>`）下一格都是字母。
  正确的收法是**先认这是不是一个类型参数表**（`IsDeclarationHeadHost`：`<` 前面是「声明词 + 名字」），
  是就整段放行折行；放宽字符表会把 `let n = a<b` 换行 `foo(bar) > x` 那一条放进来。
- **解析期的「宿主」还不是收尾期的那个宿主**（第 826 轮）：`Statement` 的三个成形器
  （`FormFrom` / `FormTail` / `StatementBranch.Condition`）要在**花括号里**决定收不收语句壳，
  于是照抄 `BindingElementCloseRule` 的宿主名单（`current.Parent` 是 `Let` / `BindingElement` …）——
  实测**一次都不响**：那条规则跑在**收尾期**（`Let` 已成形），而成形器跑在**解析期**
  （`const {` 那个 `{` 的 `Parent` 还是 `Root`）。改成按**词**判（`{` 前面那个实义单元是
  `const` / `let` / `var`，或已经升成 `Let` 的那一格）之后 7 条全绿。
  **凡是把某条 `CloseRule` 的宿主判据搬到解析期，先问「那个单元现在成形了吗」**；
  同族的第二条：判据落在 `Parent` 上时，**嵌套**那一档要顺着 `Parent` 递归问外层
  （`const { a: { b } }` 的内层 `{` 前面是 `:`，而 `:` 单独说明不了任何事——
  `case 1: { … }` / `label: { … }` 后面都是块）。
- **「这算不算无名签名」有两半**（第 827 轮）：`interface I { m` 换行 `(): void; }` 里那个 `(`
  是 `m` 的形参表（TS 是 `MethodSignature`），而 `interface I { a: number` 换行 `(): void }` 里
  那个 `(` 是**真正的**无名签名。分开它们的是**名字前面那一格**：名字自己前面是成员的起点
  （体那个 `{` / `;` / `,` / 修饰词 / 列表开头）⇒ 它是方法名。`SignatureCloseRule.Previous`
  原来用 `SkipPreviousAnnotation`（只跳注释）挡住「前面是名字」那一档，换行那一格答不上来
  ⇒ 括号被无名签名抢走、名字留下成了一条没有类型的 `Field`。
  **同一轮的两条同族**（`method-declaration.xl.md`）：`SignatureTailEnd` 判「上一行写完没有」
  要看**最后一个实义单元**（`m(): //c` 换行 `void;` 里 `i - 1` 是那条注释 ⇒ 注释成了整个返回类型）；
  收尾那个 `;` 也要跨 trivia 找（`m(): void` 换行 `;`）。
  **判「相邻」时先分两问**：问「上一个**代码**单元是什么」走 `SkipPreviousTrivia`，
  问「换行算不算边界」走 `IsMemberBoundary` / `IsLineBreakBoundary` —— 混成一句就会一边对一边错。
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
- **同一种形状的两种排版要一起认**（第 863 轮）：`1 + o["f"]().v` 里续格是**外面的兄弟**，
  再接一个运算符时它就**搬进了下一个二元单元**——链头成了「前一个单元的最后一个孩子」，
  而 `tailIsChain` 那一支只认前一种排版 ⇒ 第二种落进链支、整个第一个单元被当成链头
  （实测 `1 + o["f"]().v + 2`：缺 2 漂 1 多 3）。
  **递回去的续格必须是「那一格单元」、不能摊成平级几格**：链支的入口判据不认裸的 `(`
  兄弟（与第 744 轮同一条，这次又验了一遍——摊平会折出操作符是 `DotToken` 的 `BinaryExpression`）。
  同一轮的另一半：**赋值号不一定紧贴着逗号单元**（链把逗号推到了隔着一个兄弟的位置），
  0f 的判据要从「前一个兄弟是赋值号」放宽成「本层左边有赋值号」，且取**最左边**那一个。
- **「看前面那一格」的判据要预留「它就是第一个实义单元」那一档**（第 864 轮）：
  `BraceInExpression` 只看 `{` 前面那一格，于是 `({ … })` / `f({ … })` / `[{ … }]` 里
  「前面什么都没有」的那种 `{` 一律答「不在表达式里」——而它**在表达式里**，
  代价是花括号里那个分隔冒号被当成类型标注（`|` / `&` 折成 `UnionType` / `IntersectionType`）。
  **第二答案问它自己那一格**（`Bracket.Context` 是开括号那一刻算的，
  而 `DecideBracketContext` 会跨过 `(` / `[` 往上扫，所以这一档它答得出来）；
  **判据要收窄成「前面一个实义单元都没有」**，否则会把类体 / 接口体那一档一起放进来。
- **语言配置带来的差异不是缺陷**：`\a` 解成响铃字符而不是字母 `a`；
  `@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。
- **「谁包住谁」的成形要排在「谁成形」之后**（第 929 轮）：`Label` 从前只是**前缀标记**
  （`<Label label="outer" /><While>…</While>`，被标的语句是它的平级兄弟），而 TS 的
  `LabeledStatement` 是**包住**那条语句的。收不掉它的理由是**时序**——`LabelCloseRule` 必须排在
  `TypeDefine` 之前（否则标签冒号被当成类型标注），那一刻被标的语句还没成形，认不出边界。
  **结论不是「做不到」，而是「排错地方了」**：收前缀照旧在那一刻做，**包**那一步挪到
  **容器的规则跑完之后**（`Statement.AbsorbLabels`）——容器的规则跑在子单元都关闭之后，
  那时语句已经是一格成形单元。三条硬约束跟着一起立：
  ① **只搬「一格」语句**（`outer: for (…) { … } console.log(…)` 是平级多格，搬整段会把后面那条吞掉），
  例外是**语句壳**（壳里本来就只装一条语句，`done: f()` 那种平铺的表达式语句整段都属于它）；
  ② **判据跨 trivia、搬运也跨**（`outer:/* c */ while (…)` 里注释要跟着一起进去，
  判据与搬运共用 `Statement.LabelRunEnd`）——「相邻那一格一律走 trivia 口径」那条硬规矩的又一个落点；
  ③ **幂等**（收敛环会把这一趟再跑一遍，已包住的标签跳过）。
  **新形状要留一个能响的守卫**：`xl:expect` 只数标签、说不出「谁在谁里面」，
  所以 `cases:tags` 里另立一条**结构不变式**（产物里不许出现自闭合的 `<Label … />`）
  ——两处补丁（`projectEach` / `projectStatement` 的标签合并）在老形状上照旧能拼回 TS 形状，
  `cases:tsast` 因此**看不见**这一步退回。
- **搬东西的那一趟要排在「这一层不再变」之后，不能排在每一趟规则之后**（第 929 轮，实测踩到的）：
  `AbsorbLabels` 第一版排在 `RunCloseRules` 的末尾（与 `SplitShell` 同一个位置）——
  那一趟**每一轮收敛都会跑**，于是 `lbl: do { … } while(c);` 的平铺段 `[do, 块, while]`
  在**第一轮**就被搬进标签，`DoWhileCloseRule` 再也看不到那一对
  （实测：`DoWhile` 整条缺、`do` 投成 `ExpressionStatement > Identifier`）。
  正确的排法是 `ApplyCloseRules` 的**收敛环之后**（`Statement.AbsorbLabels(unit)` 写在 `for` 外面）：
  环走完时这一层该合的已经合了，搬进去的都是成形的。
  **判据是「这一步会不会把还没成形完的东西抢走」**——会，就往后挪到「不再变」之后。
- **一段搬完要留一个「谁在谁里面」的判据**（第 929 轮，同一条线的另一面）：`xl:expect` 是**平表**
  （标签 + 个数），说不出父子关系；而**投影那一层有两条老形状的补丁**（`projectEach` /
  `projectStatement` 的「标签 + 右边那一格」合并）——包不包进去都能拼回 TS 形状，
  所以 `cases:tsast` 对这一步**完全看不见**。这形状的守卫只能自己写一条：
  `cases:tags` 里的结构不变式（产物里不许出现自闭合的 `<Label … />`）。
  **凡是「改了树形、投影又能兜回来」的改动，都要问一句「哪把尺子看得见它」。**
- **「头还没写完 ⇒ 换行不是边界」在**标签链**上要顺着链往左走**（第 929 轮（三））：
  `a : b :` 换行 `for (…)` 与 `lbl:` 换行 `for (…)` 是同一件事，可 `IsPendingLabelHead`
  只问**末尾**那个名字（`IsStatementStart(data, nameIndex)`）——链里第二个名字前面是 `a :`
  ⇒ 判否 ⇒ 换行处按 ASI 收壳 ⇒ 两个标签各成一条 `LabeledStatement`
  （TS 那边是一条**嵌套**的，实测 `a : b :` 换行一族 6 条）。
  改法是那一问**一格一格往左问**（`IsStatementStart` 为真就收；否则看它前面是不是
  `名字 :`，是就再往左一格）：链上任意一个名字在语句开头，整串就都是标签头。
  **同族的判据都要问一句「我是不是只看了一格」**——第 828 轮的 `i ± 1`、第 817 轮的
  「相邻那一格」，与这一条是同一句话的第 N 个落点。
- **换行之后那一格由「它的左边是什么」决定，而 TypeScript 的开关在扫描器上**（第 934 轮；
  这一条是**第 933 轮登记的那四格**收完之后量出来的总纲，所以它排在这一族的最前面读，
  下面第 930–933 轮那几条都是它的落点）：
  四格登记了三轮，量清之后每条根因都是「左边那一格是谁」。四条合起来是一句话：
  **TS 的 parser 是「先拿左边那个构造、再看某个 token 能不能接上去」，而本仓的判据是
  「看那一格单元的形状」——两者的差集全在「左边那一格说的是什么」上。**
  - **`import` 结束不了一条语句**：`type T = typeof import` 换行 `("m");` 在 TS 那边是一条
    （`ImportType`）——解析期那张表（`Statement.ExpectsOperand`）原来只收「声明词 + 字面量词」，
    而 `import` 与 `function` / `const` 同一档：保留字，后面必须跟东西（子句 / 名字 / `(`）。
    **加词之前先问「这个词能不能单独成句」**（第 828 轮那条入表条件的同一句话）。
    同族的第二面在**成员位**：`type T = { f: typeof import` 换行 `("m") }` 里
    `SignatureCloseRule` 会把 `("m")` 抢成**裸形参表签名**（`IsBareParameters`：形参表之后什么都没有）
    ⇒ `import` 与那条 `Signature` 随后被 `ImportCloseRule` 收成一条**假导入声明**
    （实测缺 `ImportType` / `LiteralType` / `StringLiteral`、多 `TypeQuery`）。
    让路的是新判据 `IsImportTypeArguments`（软换行 + 名字是 `import` + 再往前一格是 `typeof`）。
    **同族的下一个落点在哪儿**：凡是「`名字 + (`」在成员位被收成签名的地方，都要问一句
    「那个名字是不是 `import`」——`MethodDeclarationCloseRule` 早就单独挡过这一格（对象字面量除外），
    签名那一侧漏了。
  - **「名字写在上一行」那一问，名字后面允许已经有一个 `GenericType`**：`m<T>` 换行 `(a:T):void;`
    与 `m` 换行 `(a: T): void` 是同一件事，`NameOnPreviousLine` 原来只看「换行前面那一格是不是名字」
    ⇒ 重载方法那一格被 `SignatureCloseRule` 抢走。**这一问只有一份实现**（`(` 与 `<T>` 两支
    第 904 轮就抽成同一份）——这正是「同一个问题两处各写一份就是两处会漂」的反面用法：
    一份实现改一处，两支一起对。
  - **换行之后那个 `[` 不是下标访问**：TypeScript 的 `parsePostfixTypeOrHigher` 外面套着
    `while (!scanner.hasPrecedingLineBreak())` —— 后置的 `[`（下标访问 / 数组类型）**从不跨行**，
    而那个闸门在 `parseNonArrayType()` **之后**（左边没拿到类型时它走的是元组那条路）。
    所以判据要**成对**：`type-bracket` 的 `Previous` 里只在 `IsTypeOperandUnit(左邻)` 时才问
    「中间有没有换行」（少了这半条，`type X =` 换行 `[C[]];` 的外层元组括号会被一起挡掉——
    实测两份守卫用例当场红）。**换行要在原始字符上问**（`HasLineBreakBetween`）：
    值类型那一段被 `TypeDefine` 收走之后，列表里的 `LineWrap` 就没了，按单元表问第二趟会答「没有」。
  - **映射类型在值类型之后照样 `parseTypeMembers()`**：`{ [K in keyof U]:U` 换行 `[K] }` 里那个
    `[K]` 是**一条成员**（`PropertySignature`，名字是 `ComputedPropertyName`），不是值类型的一部分。
    于是三处各补一块：`FieldCloseRule` 的成员体白名单收下 `MappedType`（位置判据两条——
    「值类型之前没有 `:`」挡掉键那一格、「换行或 `;` 之后」挡掉同一行的下标访问）、
    `MappedType.PrintAst` 多出 `members` 一格（`ctx.MemberList`：按成员位投，
    `Field` 因此投成 `PropertySignature`）、成员之间的 `;` 不进 `flat`（分隔符不是节点）。
    **同一族的顺手一格**：成员位里的**空方括号**（`{ a: A` 换行 `[] }`）在 TS 那边是
    **没有形参的** `IndexSignature`（`parseIndexSignatureDeclaration` 的形参表可以是空的）
    ⇒ `IsIndexSignatureName` 多一条「空括号也是索引签名」，`Process` 那一侧空括号不造 `Parameter`
    （造出来的零宽形参签不出区间）。
  - **两处成形器的老账又收一格**：`switch` 体里「第二个及以后的段头要自己起一条壳」这件事，
    `;` 那一档（`Statement.FormFrom`）第 576 轮就有了，而**换行那一档**
    （`StatementBranch.Success`）一直没有 —— `case 1: case 2:` 换行 `break;` 于是把两个段头
    收进同一条壳。两处对齐（共用 `Statement.LastClauseHeadIndex`），
    下标口径差一格：换行那一档的 `index` 是**最后一个内容单元**（换行还没进 `Data`）⇒
    上界递 `index + 1`。**这就是第 836 / 928 轮那条「每加一处都要两处成形器一起改」。**
  - **词法把两个字符并成一个单元时，「按词判」的判据要连那个合并形态一起认**（第 934 轮
    第四批普查量出的 `mappedmods-n13`）：`{ -readonly [K in keyof U]-?:U` 换行 `[K] }` 里
    可选标记与冒号是**一个** `SymbolToken("?:")`（`class-member.xl.md` 的 `ExitOrPre` 早就在
    「拆回字符还」那一句里记过这个事实），而成员的位置判据里那条「前面得先有值类型那一段」
    只认裸 `:` ⇒ 判否 ⇒ 成员不成形（缺 `PropertySignature` / `ComputedPropertyName` /
    `Identifier`）。**凡是以 `:` 为信号的位置判据，都要问一句「它会不会与 `?` 并成 `?:`」**：
    当前只有 `?:` 这一个合并形态（`SymbolTemplate` 管着），但同类判据要一起过一遍。
  - **尾随 trivia 不算区间**（第 934 轮，同一批普查第三趟）：**区间的右端取最后一个实义单元**
    ——第 920 轮在 `SignatureTailEnd`（方法签名的返回类型）上立过这一条，第 902 轮在
    `TypeDefine` 上只做了**一半**（跳的是 `IsAnnotationUnit`，**不含软换行**，理由写的是
    「软换行落在类型段里是排版、不是尾部注释」）——那句话对**中间**成立、对**尾部**不成立：
    **行注释会把它后面那个换行一起吃进来**（TS 的 trailing trivia），于是
    `type T = [a: string//c` 换行 `, b?: number];` 的 `TypeDefine` 收集到
    `[string, LineAnnotation, LineWrap]`、跳完尾部注释**还剩那个换行** ⇒ 区间比类型多一格
    ⇒ 装它的 `NamedTupleMember` / `Parameter` 跟着多一格（实测 TS[10,18) vs 产物[10,22)）。
    两处一起改：`TypeDefine` 的尾部跳过 `IsTriviaUnit`、`Parameter` 的 `SignOut` 取
    「最后一个实义单元」的末尾（`Parameter` 的 `Data` 里 trivia 照旧留着，改的只是区间）。
    **哨兵**：`tests/cases/token/types/type-tail-linecomment.ts`（28 个宿主：元组五种 /
    类型字面量与接口 / 变量声明 / 形参 / 类型实参 / 联合两档 / 数组后缀 / 返回类型 /
    函数类型两档 / 条件类型 / `infer` / `import("m").A` / `keyof` / 泛型形参表 / 枚举成员 /
    类字段 / 继承子句 / 映射键 / 模板字面量类型）。**同族的下一个落点**：
    凡是「按收集到的最后一个单元签出」的单元，都要问一句「那一格是不是 trivia」。
  - **「不是运算符」不等于「能结束一个操作数」**（第 934 轮第五批普查量出的 `incdec-n5`）：
    `let a = 1; a++; --` 换行 `a;` 在 TS 那边是一条 `PrefixUnaryExpression`（`--` 要操作数，
    ASI 不在它前面断句），而 `Statement.EndsOperand` 的判据只有一条「不是运算符」——
    解析期 `;` 收壳之后它左边那一格已经是**一条成形的 `Statement`**，而整条语句不是表达式、
    也就**不是**操作数 ⇒ 判成后缀 ⇒ 换行处收壳 ⇒ `--` 与 `a` 各成一条语句
    （实测缺 `PrefixUnaryExpression` + 漂 1 + 多 3）。判据补一条
    「`IsStatementUnit` ⇒ 不是操作数」（那个名单与「语句从这里断开」那四个调用点共用）。
    **反方向不受影响**：`a++` 换行 `++a;` 左边是 `a`（真操作数）⇒ 照旧断句。
  - **名字与形参表之间那一段，`?` 与 `<T>` 是同一档**（第 934 轮第五批普查量出的
    `membertypes-n29`）：`interface I { b?` 换行 `(): E }` 在 TS 那边是**一条**
    `MethodSignature`，而 `NameOnPreviousLine`（`SignatureCloseRule` 与
    `MethodDeclarationCloseRule` 的那条分工线，**唯一一份**）原来只认「换行前面那一格是
    名字 / 类型参数段」⇒ `?` 那一格落空 ⇒ 签名让路 ⇒ `FieldCloseRule` 把 `b?` 与 `():E`
    一起收成一条 `PropertySignature`（实测缺 `MethodSignature` / `TypeReference` /
    `Identifier`、多 1）。判据把 `?` 与 `GenericType` 并成一档各跳一次
    （TS 的两种标记次序是 `m?<T>`）。**与上面第一条是同一句话的两面**：
    「名字与形参表之间可以有什么」在这一份判据里要认全（`?` / `<T>` / 注释 / 软换行）。
- **「这个冒号是标签冒号吗」只该有一份判据**（第 930 轮）：`done: f` 换行 `()` 在 TS 那边是
  一次调用，而解析期那张续接表的 `(` 那一档先问 `HasTypeColonBefore`（「上一行是类型标注吗」）——
  它往回扫先撞上的正是**标签**那个 `:`，却一律照类型标注答 ⇒ 判「上一行到此为止」⇒ 收壳 ⇒
  调用劈成两条。同一句话在 `IsObjectLiteralBrace` 里**内联**写过一遍（标签冒号后面那个 `{` 是块）,
  于是两份答案里的一份缺了另一半。**内联过的谓词就是「第二份会漂的答案」的同义词**：
  下次看见「甲处也问过这一句」，先把它收成一格再改。

- **「上一个实义单元」与「它是不是操作数」是两个问题，`/` 那一格两个都要问对**（第 931 轮）：
  `RegexTokenBranch.Condition` 判的是一句词法问题——**紧跟在 `/` 后面的那个字符**到手的瞬间，
  前一个 `/` 到底是不是正则的开头。它要的是两件事：
  **①「上一个实义单元」**（不是「倒数第二格」）：夹一条注释时倒数第二格正是那条注释
  ⇒ 落到最后那个 `else`（答正则）⇒ `x/*c*/ / 2 / 3` 的除号被当成正则开头，
  `<RegexToken>` 把 ` 2 ` 当正文吞掉。这一半改走 `SkipPreviousTrivia`
  （与第 817 轮那条「相邻的那一格一律走 trivia 口径」同源）。
  **②「那一格是不是能给表达式收尾」**：`String`（引号串与模板串）/ `RegexToken` /
  后缀 `++` `--` 全是**写完的操作数**，`this` / `super` 两个关键字也是
  （`IsAssertableOperand` / `IsOperand` 里早有同一句）——不是的话 `"s" / 2 / 3` /
  `` `t` / 2 / 3 `` / `/re/ / 2 / 3` / `i++ / 2 / 3` / `this / 2 / 3` 五族全被读成正则
  （各缺两条 `BinaryExpression`）。两半的判据都**按类名 / 词问，不 import 那个类**
  （这一层 import 会绕出环，与 `IsTriviaUnit` 同一条理由）。
  **另一面**：`/` 出现在**下一行的第一个实义字符**上时，只要上一行是**写完的表达式**，
  它同样是除号（`Statement.NextLineContinuesExpression` 原来没有这一档 ⇒
  `const a = 1` 换行 `/ 2 / 3;` 在换行处收壳、后半截还被读成一条正则）——
  与 `<` / 模板串那两条同一个理由：「**接在一条表达式后面的那个字符，先问它还能不能当二元运算符**」。
- **一条运算符链能不能折，还取决于「左边那一格认不认成操作数」**（第 931 轮，同一族的另一面）：
  `binary-operator.xl.md` 的 `IsOperand` 里没有 `RegexToken`，于是 `/re/ / 2 / 3` 的第一条 `/`
  **找不到左操作数、留在原地成了裸符号**，而后半截 `2 / 3` 自己折成一个二元节点
  ⇒ 投影出来是 `/re/ / (2 / 3)` 那种形状（漂移 1 + 多 1；只有两个操作数时反而对，
  因为那一格不需要折）。**凡是在词法那一格被判成「操作数」的单元，折叠那一格的名单里也要有它**
  ——两份名单是同一件事的两面，第 931 轮把 `RegexToken` 同时补进两处。

- **「签出落在哪一格」也是区间的一部分**（第 932 轮）：`RegexToken.ExitOrPre` 的收尾那一支
  拿到 `source` 时，当前字符**已经在字面量外面**了（标志位之后的第一个字符，或者收尾 `/`
  之后那个字符），`SignOut(source)` 于是让单元区间比字面量多一个字符
  （`typeof /re/;` 里那个 `;` 也算进正则）。**症状不在正则自己身上**——`PrintAst` 用
  「从 `/` 扫到配对的 `/`」重新量过，所以 `RegularExpressionLiteral` 一直是对的；
  多出来的那一格是**父节点**按 `v.end` 算的时候带出去的（`TypeOfExpression[10,22)`）。
  改法：`this.SignOut(source.Pre()!)`。**凡是「收到结束标记之后再签出」的那类单元，
  都要问一句「这一格是不是已经出界了」**——同族的下一个落点还在往出冒的时候，
  先量清楚「谁按这个区间算终点」（这里是走通用支的那些父节点）。

- **零宽节点的位置要问「它是按哪一个分隔符算的」**（第 933 轮）：数组的洞是
  `OmittedExpression[13,13)` 这种零宽节点，TS 放的位置是「**上一个逗号**之后那一格」——
  `[1, , 2]` 的两个洞是 13 / 15，`[1/*c*/, , 2]` 的洞是 18（第一条逗号在 17），
  头一个洞 `[, 1]` 是 11（**紧跟 `[` 之后那一格**，不是再 +1）。
  **原来的写法**是 `lastEnd + 1`（上一个**元素**的终点 + 1）——两者在「元素与逗号之间没有东西」
  时同值，夹一条注释 / 一个换行时就差一格（这一族因此静默了三百多轮，
  直到第 933 轮把那 45 个构造的每个相邻位置都插一遍 trivia 才现形）。
  **两处实现同一份口径一起改**（`tokens/json/array-literal.xl.md` 与
  `print-ast-common.xl.md` 的 `projectEachIn`：一处写「洞的位置」，另一处写着同一句话却写着
  同一个错式）。**同类判据的检查项**：这个零宽 / 空段节点的坐标，是按**前一个分隔符**、
  前一个**实义单元的终点**、还是**后一个分隔符**算的——三者在没有 trivia 时全同值。

- **同一个「相邻关系」问两遍时，两侧要跳一样多的 trivia**（第 937 轮）：
  `ForeachCloseRule.Previous` 那一侧早就用 `GetSkipNextTrivia`（注释 + 软换行都跳），
  而 `BinaryOperatorCloseRule` 里那条「`in` 是分隔词不是运算符」的判据还在用
  `SkipPreviousWrapSymbol`（**只跳软换行**）往回找 `for` ——
  **同一条判据的两半各写一遍、各跳一档**，于是 `for /*c*/ (const k in o)` 撞上注释就找不到
  `for` ⇒ `k in o` 先被折成 `BinaryOperator` ⇒ 轮到 `Foreach` 时括号里已经没有那个词，
  整条句子退化成 `ExpressionStatement`（缺 6、多 2）。凡是看到「这一格左边 / 右边是不是某某」
  的判据，先问一句：**对面那一侧跳的是哪一档**。

- **「换行是不是语句边界」要问「左边那一格还能不能独自站住」**（第 937 轮）：
  `new ns.` 换行 `C()` 里 `new ns.` **不是**一条能独立成立的表达式（点号后面必须有名字），
  所以这个换行**结构上不可能是语句边界**；而 `new A` 换行 `const c = new B()` 里
  左边那格 `A` 是完整的操作数。判据的落点因此是「上一个**实义**单元是不是 `.`」
  （`SkipPreviousTrivia`，注释与软换行都跳过），而不是「上一格是不是一个普通单元」，
  更不是去数换行的个数。`NewCloseRule.Process` 那一趟现在有四个「不是边界」的分支
  （换行 + `GenericType` / 换行 + `(` / 换行 + `.` 或 `[` / 换行且上一格是 `.`），
  它们各自钉的都是一句「左边那一格凭什么还能接着长」。
  **同一族的反面**：落点是 `[` 的跨行下标访问（`new ns` 换行 `[a]()`）**没**收下来，
  按规矩登记为 `gap-r937-new-index-callee-newline`；
  尖括号断言跨换行（`const a = <T>` 换行 `x;`）同样登记为
  `gap-r937-angle-assertion-newline`。

- **「体写在下一行」的守卫要问「这一格还在不在手上」**（第 938 轮，量到、未收）：
  `while (a)` 换行 `foo();` / `while (a)` 换行 `break;` / `for (const x of y)` 换行 `continue;`
  / `for (;;)` 换行 `foo();` 四档，TS 都是一条循环语句（体是下一行那一条），
  本仓把体判成**空**、体那一条另起一个 `Statement`。
  `while` 那一趟的插桩读数：`Process` 收到 `index=0`、单元列表就是
  `[Identifier(while), Bracket((a))]`（体那几个单元**还没进列表**）、`len=2`，
  `endIndex = SkipNextTrivia(...) = 2 = len` ⇒ 直接落进 `emptyBody` 那一支，
  `endIndex` 退回 `currentIndex - 1`（那个条件括号）⇒ `While` 区间只到头部。
  **`if (a)` 换行 `foo();` 没有这个毛病**（`IfSegment` 走的是另一条路）——
  所以坏的是 `WhileCloseRule.Process` / `ForCloseRule.Process` 体那一段：
  `Statement.SearchStatementEnd` 在「体还没进单元列表」时给 `-1`，
  而那一支的兜底是 `Statement.LastMeaningfulIndex`（同样给 -1）⇒ 只好当空体。
  **现有的 `stmt-header-body-next-line.ts` 只钉了花括号体那一半**
  （`while (a)` 换行 `{ break }`），体是单语句时一个守卫都没有 ——
  这一轮补 `gap-r938-loop-body-next-line.ts`。
  **下一轮的第一站**：`ForCloseRule` / `WhileCloseRule` 的体那一支在
  `SearchStatementEnd === -1` 时该不该改成「等下一趟」（让路），而不是「当空体」。
  **别动 `SearchStatementEnd` 本身**：它给 -1 是对的，错的是拿 -1 当「体是空的」。

- **`new` 后面的**关键字**被构造者（第 938 轮，量到、未收）**：`new class { m() {} }()`
  是 `NewExpression > ClassExpression`，而 `NewCloseRule.Previous` 只认
  「后面紧跟 `Identifier` 或 `(` 括号」⇒ `class` 两者都不是 ⇒ `new` 留成裸 `Keyword`。
  同一批里 42 条（`/*c*/` / 换行 / 行注释各 14 格）整族红。
  守卫 `gap-r938-new-anonymous-class.ts`。
  它与「括号里的被构造者」（`new (class {})()`，那一支已经能走）是**同一件事的两半**：
  `Previous` 那一条「紧跟类型名」的判据要连**值位的关键字**一起认。

## 收缺口的两条规矩

- **一次收一族**：把量出来的那一族整个收掉；量出来的时候**先补用例**（带 `xl:known-gap` 进语料），
  收掉的时候删掉那行指令——只修现场那一条，下一轮换个排版又回来。
- **先探「同族的第三条」**：`do` 的体自带分号那一族、循环头部括号里出现 `)`、
  括号 / 一次调用当被调用者时的可选链、「注释 / 换行落在语法相邻位置之间」，
  都是这么一条一条量出来的——**最后那一族是今天最大的一族**（见下）。

## 已知仍开着的缺口（**13 条**）

**第 972 / 973 / 974 轮：第 971 轮登记的两格收掉（清单第十五次清空），同一轮的普查又量出 13 格**

- **收掉的两格**（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：
  [`gap-r971-nonnull-call-thrice-member`](../../tests/cases/token/expressions/gap-r971-nonnull-call-thrice-member.ts)
  （`a!()()().c`）与
  [`gap-r971-opt-assert-index-member`](../../tests/cases/token/expressions/gap-r971-opt-assert-index-member.ts)
  （`a?.b![0].c`）——两格都是**两处判据各缺一句**（入口 + 层数 / 子链抬出 `isDot` 段 + 子链循环缺下标那一支），
  逐句来龙去脉写在各自的用例头里。
- **登记的那 13 格**（第 974 轮换一批**更深**的底样普查：30 条同族片段里 13 条对不上）：
  `gap-r973-*` 一共 13 份，全在 `tests/cases/token/expressions/`，按三族分——
  1. **「层数」要递归着问**：`nonnull-call-quad`（`a!()()()()`）、`nonnull-call-quad-member`、
     `nonnull-member-call-quad`、`nonnull-call-assert-call-assert`、`nonnull-call-twice-assert`、
     `member-call-thrice-member`；
  2. **同形副本**：`opt-assert-call-thrice`（`a?.b!()()()`）、`opt-assert-call-thrice-member`、
     `opt-index-call-thrice`——第 972 轮改的是 `projectExpression` 链循环那一份，
     `chainWithOptional` 的子链分支里还住着同形的另一份；
  3. **断言 + 下标 / 断言 + 调用落在 NCO 尾巴上**：`opt-assert-index-index-member`
     （`a?.b![0]![1].c`）、`opt-assert-index-call-member`、`opt-call-assert-index`、
     `opt-call-assert-index-member`。
- **下一轮的入手处**：从上面第 1 族那 6 格挑——它们同一个问句（「这一格自己盖着几层调用」），
  一次能把一族收掉；第 2 族要先数清**同形副本有几处**（第 970 轮的教训：锚点要选那一段独有的字符串）。
- **数字**：`cases:tsast` 已知缺口 **2 → 0 → 13**；`coverage` **4221 / 4383 → 4223 / 4396**
  （分子 +2 是那两格转绿、分母 +13 是这一轮登记的账，`blocked 27 → 38`）、加权 **95.6%**；九道门全绿。

**第 960 轮：`yield` / `await` 的「第三态」按「有没有操作数」量到底——裸的那个词按上下文分**

- **收掉的那一条**是第 955 轮登记的最后那一格
  （[`gap-r955-yield-await-outside-context`](../../tests/cases/token/expressions/gap-r955-yield-await-outside-context.ts)，
  `xl:known-gap` 按规矩撤掉，用例留着当守卫）：`const v = yield;` / `function f() { return (yield); }`
  / `const w = await;` / `function g() { return await; }` 一律投成 `YieldExpression` / `AwaitKeyword`，
  而 TS 那边是 `Identifier`（缺 1 多 1）。
- **第 955 轮登记时写下的入手处是「给投影一个『当前函数是不是生成器 / async』的上下文」，
  这一轮量下来发现它**只对了一半**——判据不是「我在不在上下文里」，而是
  **「这个词有没有操作数」与「在不在上下文里」两条一起**。按 TS 逐档量出来的表：

  | 写法 | TS |
  | --- | --- |
  | 生成器里 `yield 1` / `yield* g()` | `YieldExpression` |
  | **非生成器**的 `function f() { yield g(); }` | `YieldExpression`（TS 照收，运行期才报） |
  | **裸** `yield`（`const v = yield;` / `return (yield);`）——非生成器 | **`Identifier`** |
  | `async` 函数里 `await 1` | `AwaitExpression` |
  | **非 async** 的 `function f() { await g(); }` | `AwaitExpression`（同上） |
  | **裸** `await`（`const w = await;` / `return await;`）——非 async | **`Identifier`** |
  | **模块顶层** `await 0;`（不在任何函数体里） | `AwaitExpression` |

- **修法两条一起**：①这一格只有那个词（`kids.length === 1`，没有操作数、没有 `*`）；
  ②祖先链上没有生成器 / `async`（新判据 `print-ast-common.xl.md` 的 `functionContextOf`）。
- **两个半边都实测红过**（这一轮踩的两次，记下来别再各试一半）：
  - 只看 ②（「不在生成器 / async 里就是标识符」）⇒ `await 0;` 这种**模块顶层 await**
    一起判掉，`expr-dynamic-import-not-type` / `im-dynamic` / `mod-import-dynamic-await` /
    `mod-top-level-await` / `gap-sweep-*-async-01` **五条守卫当场红**（`blocked 28 → 33`）；
  - 只按 `headKind === "Keyword"` 放行（忘了再认一次词）⇒ 产物里 `this` **同样是 `Keyword`**，
    每一格 `this` 都被投成 `Identifier`（整份文件 `ThisKeyword` 全没、降级期报
    `name is not a local or a capture: this`）⇒ `coverage 4201 → 3814`、`blocked 28 → 314`。
- **`yield` / `await` 的祖先链上有三种「函数体」标签**（`Function` / `MethodDeclaration` / `Lamda`），
  生成器记号是 `Function` / `MethodDeclaration` 里**形参表之前**的一格 `SymbolToken`，
  `async` 折进 `modifiers`（`Lamda` 另外还有 `IsAsync` 字段、`async` 箭头那一档
  `async` 留在 `Data` 里当一个 `Identifier`）。
- **上下文的问法是祖先链，不是 `ctx` 标志**：`projectExpression` 收到的每一格都带
  `__token`（`WithRangeOf` 记的），`Parent` 链就是产物树——语句 → 体 → 函数，一两跳就到；
  而带 `ctx` 标志要改的是每一处进函数体的投影路径，漏一处就退化成「在生成器里也不认」。
- **读数**：`cases:tsast` 已知缺口 **1 → 0**（**清单第十四次清空**）、逐节点一致；
  `coverage` **4201 / 4367 → 4204 / 4369**（那一条转绿、另加两条守卫：`blocked 28 → 27`、
  `differ 138` 没动）；九道门当轮全绿。
- **可复用的判据**：**「同一个词两态」的清单要按「有没有操作数」再核一遍**——
  第 130 / 739 轮为 `await` / `yield` 写的是「这个词在不在这一格」，
  而 TS 那边真正的分界是**「带操作数 ⇒ 一律是表达式」+「裸词 ⇒ 才看上下文」**。
  登记时写下的「给投影一个上下文」只是一半；**下一处这类落点先问「这个词后面跟没跟东西」**。

**第 959 轮：谓词那个括号落在「带体的类成员返回类型位」时往回走那一趟认错形参表**

- **收掉的那一条**是第 958 轮登记的最后那一格
  （[`gap-r958-class-method-predicate-paren`](../../tests/cases/token/types/gap-r958-class-method-predicate-paren.ts)，
  `xl:known-gap` 按规矩撤掉，用例留着当守卫）：`class C { m(x: unknown): x is (string) { return true; } }`
  整条 `m` 塌成一次调用（缺 `MethodDeclaration` / `Parameter` / `TypePredicate` /
  `ParenthesizedType` / `Block`，多 `CallExpression` / `TypeReference`）。
- **根因在 `BodyIndex` 往回走那一趟的第 598 轮边界上**：`ScanDeclarationBody` 扫到那个 `{`，
  往回走撞上的第一对 `(` 是谓词里那对 `(string)`——它前面是 `is`、**不是一个类型续接符**，
  所以 `IsTypeContinuationBefore` 给假；那一趟于是拿它跟「本签名自己的形参表」比原文。
  而 `m` 那一趟往回走得多一格：`(x: unknown)` 与它**逐字相同** ⇒ 中途 `break`、跳过
  `is` 与 `(string)` 直接答真 ⇒ `is` 被认成「名字 + `(` + 体」。
- **修法**：往回走那一趟**多认一格**——「这一对括号是谓词里的类型」时**接着往回找**
  （与类型续接符那一支同一个去处），由**真正的形参表**决定这一条声明有没有体；
  判据**转发**给谓词那条规则的同一份实现（`TypePredicateCloseRule.Claim`，第 957 轮起装在
  `MethodCloseRule.PredicateShape` 上，第 959 轮把**同一个箭头函数**也装到
  `MethodDeclarationCloseRule.PredicateShape`）——第 875 轮的规矩：判据只有一份。
- **那一份判据有副作用**：答真的同时会**当场把括号收成 `ParenthesizedType`**（第 957 轮的
  设计），所以调用点必须**先把括号取在手上再去问**（问完 `units` 里那一格已经不是 `Bracket` 了）。
- **「跳过」而不是「收手」是量出来的**：收手那一版把 `interface I { m(x: unknown): x is (string) }`
  这种**无体**签名也一起判否（那一格第 958 轮已经是好的）；跳过之后由后面那句原文比较
  分两档——`m` 那一趟（当前形参表是 `(x: unknown)`）撞上它 ⇒ 答真；`is` 那一趟
  （当前形参表是 `(string)`）撞上它 ⇒ `-1`。
- **为什么不是第 958 轮撤回的那一版**：那一版把闸门下在 `Previous` 的入口（问「这一格整体
  是不是一条方法声明」），一次普通调用 `m(x: unknown)` 也在覆盖之内——实测 18 条普通
  方法声明一起判否（片段 2 → 20 条对不上）。这里问的是**往回走的那一对括号**，
  只在「已经认定这一格有一个体」之后才轮到它。
- **读数**：`cases:tsast` 已知缺口 **2 → 1**、逐节点一致；`coverage` **4200 → 4201**
  （blocked **29 → 28**）；九道门里八道当轮全过。
- **可复用的判据**：**「往回走那一趟」也要认形状**——第 598 轮那条原文比较是**纯文本**的，
  它分不出「这一对 `(` 是返回类型里的类型」与「是本签名的形参表」；而**类型续接符那张表
  只覆盖了运算符引出的类型**，谓词（`is` / `asserts`）引出的类型不在表里。
  下一处这类落点就长在「某一趟只按原文/形状对齐、不认引出类型的那个词」上。

**第 956 轮：近路普查第二轮——成员最后那一格的括号化类型当轮收掉、谓词里的括号化类型登记**

- **手法**：照第 955 轮那条结论（**近路普查比宽面普查便宜**）再铺一批：专挑「括号落在
  只认一种身份的槽位里」的落点（装饰器名 `@(a)`、`instanceof (B)`、`case (a)`、
  `return (x)`、`spread ...(a)`、`enum E { A = (1) }`、`as (T)` / `satisfies (T)`、
  `keyof (A)`、`readonly (A[])`、索引签名 `[k: (string)]`、`f<((A))>(x)`、
  `extends (a as any)`、`catch ((e))`、`(a) ? (b) : (c)` …共 60 条）——量出**两族**；
  再把两族各自摊成 33 条与 20 条。
- **收掉的那一族**：**成员最后那一格的括号化类型**。`type T = { a: (B) }` /
  `interface I { m(): (B) }` / `type T = { get a(): (B) }` / `type T = { a?: (B) }` 里
  TS 是 `ParenthesizedType`，产物却收成一条无名 `<Signature kind="call">`
  （缺 `ParenthesizedType` + `TypeReference`、多 `CallSignature` + `Parameter`）。
  **根因**：`SignatureCloseRule.Previous` 看见「成员位置上的一对 `(`」就按「无名签名的形参表」收，
  而**后面没有别的成员**时 `HasSignatureTail` 答真（有 `;` / `,` / 下一条成员时它答否
  ⇒ 此前只有**最后一条**中：`{ m(): (B); n(): void }` 一直是好的）。
  **修法**：多问一句「上一个**实义**单元是不是 `:` / `?:`」——签名语法里形参表前面不会有冒号；
  软换行与注释都跳（`a:` 换行 `(B)` 与 `a: /*c*/ (B)` 同形），**`?:` 在产物里是一格
  `SymbolToken`**（`MethodDeclarationCloseRule.IsTypeContinuationBefore` 就是这么认它的，
  只认 `:` 时 `a?: (B)` 照样红——这一格是补第二遍才量的）。
  读数：33 条那一批 **19 → 7**、20 条那一批 **9 → 0**、60 条那一批 **4 → 2**
  （剩下的全是下面那一条）；`cases:tsast` 逐节点一致。
  守卫用例 [`ty-member-last-paren-type`](../../tests/cases/token/types/ty-member-last-paren-type.ts)。
- **登记的那一条**（`xl:known-gap`）：[`gap-r956-predicate-paren-type`](../../tests/cases/token/types/gap-r956-predicate-paren-type.ts)
  ——**类型谓词里那个类型套一层圆括号**时整条谓词不成形（`function f(x): x is (string)`：
  缺 `TypePredicate` / `ParenthesizedType` / 类型自己的关键字，多若干格）。
  与收掉的那一族**同形不同路**：那一族的判据在「成员位置的 `(`」那条分工线上，
  谓词走的是另一条投影路径（`tokens/type-predicate.xl.md` 的 `PrintAst`）。
  **不带括号的谓词一直是好的**（`x is string` / `asserts x is string` 逐节点一致）。
  **入手处**：让谓词的类型那一格走**与成员类型同一条**的投影入口，**别在谓词里另写一份括号判据**。
- **可复用的判据**：**「谁先把这一格认走」是这类缺口的分水岭**——两族都长在
  「一个槽位只认一种身份 / 一条规则先伸手」上：第 955 轮是 `ScanHead` 的实体名只认 `Identifier`，
  这一轮是签名规则先伸手把「冒号后面那个 `(`」认成形参表。**问「上一格是什么」比问「这一格是什么」便宜**
  （`:` / `?:` 一句话就把整族挡住），而**那句问话用的词表要抄现成的**
  （`?:` 是一格、不是两格——现成的 `IsTypeContinuationBefore` 里写着）。

**第 955 轮：清单空着时的第五次普查——259 条片段量出两族：接口继承的圆括号当轮收掉、`yield` / `await` 的「第三态」登记**

- **手法**：清单空着就换一批构造再量（第 907 / 946 / 947 / 948 / 953 / 954 轮那条路）。
  这一轮三批：①**宽面普查** 195 条（计算名 / 罕见表达式 / 语句与 ASI / 声明 / 类型位 / trivia
  插在每一个 token 边界）——**0 条对不上**；②**近路普查** 50 条（照第 954 轮那条
  「近路会绕开现成判据」的结论，专挑**单子单元**的落点：语句壳、括号化继承、`typeof (x)`、
  `new (a)(b)`、`(yield)` …）——量出**两格**；③把这两格各自**摊成一族** 30 条。
- **收掉的那一族**：`interface I extends (J) {}` ——括号化的实体名。
  TS 那边是 `HeritageClause > ExpressionWithTypeArguments > ParenthesizedExpression > Identifier`
  （`ExpressionWithTypeArguments` 的区间**含括号**），而产物里**整条声明退回 `ExpressionStatement`**
  （缺 6 多 2）。**与类那一侧同形**：`class C extends (Base) {}` 一直是好的，因为
  `HeritageClause.ClauseEnd` 早写着「`(` 不是边界，括号属于那个实体名」。
  根因在 `InterfaceBranch.ScanHead`：`extends` 名单里实体名那一格**只认 `Identifier`**
  （走 `TakeDottedName`）⇒ 撞上 `(` 就答否 ⇒ 接口头不成立。
  **修法**：那一格是 `(` 括号时跨过它，**名字文本不收**（与类那条路逐字一致：
  `class C extends (a.b) {}` 的 `extends=""`），括号里是什么交给
  `ExpressionWithTypeArguments.PrintAst`（它早就有括号那一支）。
  守卫用例 [`decl-interface-extends-parenthesized`](../../tests/cases/token/declarations/decl-interface-extends-parenthesized.ts)。
- **登记的那一条**（`xl:known-gap`）：[`gap-r955-yield-await-outside-context`](../../tests/cases/token/expressions/gap-r955-yield-await-outside-context.ts)
  ——`yield` / `await` 在**生成器 / async 之外**是普通标识符（`const v = yield;` 在脚本语境里
  TS 给的是 `Identifier`；非 async 函数里的 `await` 同理），产物一律投成
  `YieldExpression` / `AwaitKeyword`（缺 `Identifier` 1、多 1）。**与括号无关**
  （`const v = yield;` 与 `const v = (yield);` 同形）；**名字位是好的**
  （`const await = 1;` / `{ yield: 1 }` 逐节点一致）——坏的全在表达式位。
  **缺的是「第三态」**：第 130 / 739 轮为「同一个词两态都要认」写的判据问的是
  「这一格是不是 `yield` / `await`」，而要问的是「**我在不在那个上下文里**」。
  **入手处**：给投影（以及 token 层那一趟）一个「当前函数是不是生成器 / async」的上下文；
  **别在这一格写第二个近似判据**。
- **可复用的判据**：**「近路普查」比「宽面普查」便宜**——195 条常规构造一条没量出来，
  50 条专挑单子单元落点的反而量出两格。近路的形状只有几种（`kids.length === 1` /
  「实体名那一格只认 Identifier」/ 「括号在别处早就是实体名的一部分」），
  照它们**逐个落点问一遍**，比再铺一遍构造面有效。

**第 954 轮：第 953 轮登记的那一格收掉——计算属性名里的圆括号（清单第十三次清空）**

- **根因**：`print-ast-common` 的 `computedNameExpression` 给**单个子单元**开了一条近路
  （`if (kids.length === 1) return projectNode(kids[0], ctx)`），而「值位括号 →
  `ParenthesizedExpression`」那条判据长在 `projectExpression` 里（`parenthesizedOf`）——
  `{ [(x in y)]: 1 }` 计算名里就**只有一个** `Bracket`，于是它一次都没被问到，投出一格裸
  `Bracket`（未映射）⇒ 缺 `ParenthesizedExpression` 1、多 `Bracket` 1。
- **修法**：那一格的单子单元也**交给 `projectExpression` 问一次**，近路删掉——
  **判据一条没新写**（值位括号那一条还是 `projectExpression` 里那一条）；
  单个非括号单元仍落到它的末尾那一句 `return projectNode(kids[0], ctx)`，逐格同一结果。
- **读数**（片段探针 `tmp/r954/snips.json`，25 条形状）：**0 条对不上**——对象字面量 /
  类字段 / 类方法 / getter / 类静态字段 / 嵌两层括号 / 括号里是箭头·函数表达式·`new`·三元·
  逗号·赋值·模板串·`as` 表达式，25 条一次全过。守卫用例
  [`gap-r953-computed-paren-name`](../../tests/cases/token/expressions/gap-r953-computed-paren-name.ts)
  （`xl:known-gap` 按规矩撤掉，用例留着当守卫，另加类字段 / 类方法 / 嵌两层三条排版）。
  `cases:tsast` 16/16 片、投影 39551 / 39551 逐节点同 kind 同区间、字段名不一致 0。
- **可复用的判据**：**近路（`if (单个) return projectNode(...)`）会把这一层现成的判据整条绕过去**——
  量到「同一形状在别的落点是好的」时，先去看那个好落点走的是哪一条函数，
  再看目标落点是不是在它前面就**抄近路**走掉了。这一族的根不在括号判据里，在那句近路里。

**第 953 轮：缺口清单空着时的第四次普查——三批 678 条片段，量出两格：当轮收掉一格、登记一格**

- **收掉的那一格**：`lbl: { const o = { [K in T]: X }; }` —— 里层 `{` 的父亲是**标签块那个 `{`**，
  而它在 `BraceInExpression` 眼里是「表达式里的 `{`」（前面是标签冒号）⇒ 位置链爬了进去、
  撞上的是**标签冒号** ⇒ 答「类型位」。**判据**：链到标签块也断（`IsLabelColon`，第 930 轮收成一份的那条）。
- **第一版停宽了、当场量回来**（如实记）：`{ a: { b: { [K in T]: X } } }` 里 `a:` 也是「名字 + 冒号」，
  `IsLabelColon` 对它照样答真 ⇒ 链在**成员位**就断了，第 952 轮刚收的 `value-nested-2` 当场又红。
  **补一句「父亲那一格不在花括号里」才分开两者**：成员分隔冒号住在花括号的 `Data` 里，标签冒号住在语句列表里。
- **登记的那一格**（`xl:known-gap`，**第 954 轮收掉**，见上）：计算属性名里**套一层圆括号**时括号不成形
  ——`const o = { [(x in y)]: 1 };`：TS 是 `ComputedPropertyName > ParenthesizedExpression > BinaryExpression`，
  产物里那对圆括号是**一格裸 `Bracket`**（未映射），缺 1 多 1。与 `in` 无关（`{ [(a + b)]: 1 }` /
  `{ [(f(x))]: 1 }` 同形）；**同一形状在别的落点是好的**（`const v = (x in y);` / `f((x in y));` 逐节点一致）
  —— 投影那边有现成的「值位括号 → `ParenthesizedExpression`」判据（`print-ast-common` 的 `parenthesizedOf`），
  认出的是「这一格是操作数」那种落点，认不出**计算属性名那一格**。
  **入手处**（第 954 轮照它做的）：找计算属性名那条投影路径（`ComputedPropertyName` 的名字投影），
  把「一格 `(` 括号」按 `parenthesizedOf` 投——**判据别新写**；收在 `computedNameExpression` 那句近路上。
- **这一轮三批的读数**：①「把同一形状放进 55 个落点」**0 条对不上**（那一族已被第 951 / 952 两轮量干净）；
  ②「每个相邻位置插 `/*c*/` / 换行」**592 条 0 条对不上**；③「成员位」31 条里 **2 条对不上**（上面两格）。
- **可复用的判据**：**量「同一个形状换落点」比量「同一个落点换形状」便宜**——真缺口在另一条投影路径上；
  而「名字 + 冒号」这个形状在成员位与语句位**词法同形**，判据必须再问一句「**它在谁的表里**」。

**第 952 轮：位置要问「外面那一层」——第 951 轮如实记下的那条（嵌一层）与它那一族一起收掉**

- **根因**：里层那个 `{` 往回扫撞上的是**属性那个 `:`**，`IsTypePosition` 在它自己那一层只会答
  「类型位」；真正分开类型与值的是**外面那一层**（`const o = {` 还是 `type Q = {`）。
- **修法**（`type-literal.xl.md` 的 `IsMappedKey`）：位置那一问落在「容器**直接嵌在里面的**那个花括号」上，
  再套一层就再往上爬一格，**两处停**——① 父亲不是花括号（`(` / `:` 那里类型重新进场，
  `const o = { a: (x: { [K in T]: X }) => 1 }` 因此爬不出去）；② 父亲不是「**表达式里的** `{`」
  （`BraceInExpression`）。
- **第②道闸是第一次爬过头量出来的**（如实记）：只写第①条时 `cases:tsast` 当场 **13 / 16 片**，
  `@types/node` 三片各报「多出来」的 `InKeyword` / `KeyOfKeyword` / `PropertyAccessExpression`——
  原形是 `declare module "os" { type SignalConstants = { [key in NodeJS.Signals]: number } }`：
  里层 `{` 的父亲是**模块体**，位置判据对它答「值位」（它前面是模块名那个字符串）。
  **声明体的 `{` 不是「里面还有一层位置」的花括号**，链到它就断。
- **读数**（片段探针两批共 26 条：`tmp/r951/snips.json` 11 条 + `tmp/r952/snips2.json` 15 条）：
  全过 0 条对不上（含嵌一层 / 嵌两层 / 值位里嵌参数标注 / 映射里再套映射 / 方法返回类型 /
  接口成员 / 联合类型里的映射值）。
- **守卫用例**：`tests/cases/token/expressions/expr-object-computed-in-nested-family.ts`
  （嵌一层 + 嵌两层，值与类型各两条）。
- **可复用的判据**：**「往上问一层」的链要在「类型重新进场」与「不是在表达式里」两处停**；
  后者是这一轮量出来的实测边界——声明体里根本没有「这一层处在类型位还是值位」这回事。

**第 951 轮：把「位置判据」接到折叠那一刻（缺口 1 → 0，清单再次清空）**

- **收法**：`tokens/type-literal/type-literal.xl.md` 新增 `TypeLiteralCloseRule.IsMappedKey(unit)`——
  **形状**仍问 `text-common-util.xl.md` 的 `IsMappedKeyBracket`（那一条一个字节没动），
  **位置**则由「容器还是**没关闭**的那个 `{` 括号」去问同一份 `IsTypePosition`
  （`IsTypePosition(container.Parent.Data, container.Parent.Data.indexOf(container))`）；
  三处改问它：`type-parameter.xl.md` 的 `OwnerOf` / `Process`、`as.xl.md` 的 `Previous`。
- **为什么不挪进 `text-common-util`**（第 949 轮写的两个选项之一）：`IsTypePosition` 自己要用
  `Statement.IsLineBreakBoundary`，挪下去会绕出环 ⇒ 把**合起来的那一问**留在判据的家里
  （`type-literal.xl.md`），token 层 import 它。
- **为什么 `Bracket.Context` 顶不上**（第 949 轮试过、退回）：它回答的是**另一个时刻**
  （开括号那一刻，前文还是平列表，`type M<T> = {` 的 `<T>` 还没升格成 `GenericType`，
  `Promise<{ … }>` 那个 `{` 的宿主也还不是 `GenericType`）⇒ 两种排版答 `"value"`。
  **第 951 轮插桩**（`tmp/r951/probe2.mjs`）：折叠那一刻外层 `{` 还没关闭，但**已经在宿主自己的
  平列表里**（`BracketBranch.Success` 的 `AddToMounted` 挂的），所以同一刻问 `IsTypePosition`
  这两种排版（以及第 949 轮坏掉的那六条）**全部答「类型位」**。
- **读数**（`tmp/r951/snips.json`，11 条形状）：登记那条 `缺 11 漂 0 多 4 → 四方向全 0`；
  10 / 11 条通过。
- **一条留在门外、没登记的**（**改之前就存在**、与本轮这一格无关，如实记）：
  `const o = { a: { [K in T]: X } }`（值位对象字面量里**再嵌一层**）仍把里层那个 `in` 当映射键——
  那一刻里层 `{` 的 `IsTypePosition` 撞上的是**属性那个 `:`**，答「类型位」；
  片段探针里它是唯一一条红的（缺 2 多 2，与本轮修的那条**同一形状、只差嵌套**）。
  ⇒ **第 952 轮把它连同那一族一起收掉**（见上一条）。
- **可复用的判据**：**判据要问在「两边的答案都已经存在」的那一刻**。同一个问题被两处各答一遍时，
  先问「哪一处答得准、**它答的是哪一刻**」——这一轮两处判据都不缺，缺的是折叠那一刻没人问位置。

**第 950 轮：第 949 轮登记的第二条按「窄判据」收掉（缺口 2 → 1）**

- **收法**（`tokens/function/method-declaration.xl.md` 的 `IsMemberSignature`）：`ObjectLiteral`
  那一档**不是整档放开**，只认一条缝、两条都成立才算成员签名——
  ①**形参表之后紧跟 `:`**（真的写了返回类型）；②这一格在**成员位**（父单元里它前面那个
  实义单元是开头 / `;` / `,`）。于是 `{ a: b(c) }`（前面是属性冒号）与 `{ f(x) }`
  （没写返回类型）都保持原样；类 / 接口 / 类型字面量那三档**不加**这两条。
- **读数**（`tmp/r948/snips4.json`，10 条形状）：`{ new (a: number): I }`、
  `{ a: 1, new (x): I }`、`{ f(x): T }`、`{ m(a: number): void, n(b: string): void }`
  四条**新通过**；`{ a: b(c) }` / `{ a: new C(1) }` / `{ new (a) { … } }` 一字不动。
- **两条留在门外、没登记的**（都是**改之前就存在**的差，与本轮这一格无关，如实记）：
  `{ f(x) }`（TS 是一条**没有返回类型**的成员签名，产物是 `ShorthandPropertyAssignment` +
  `CallExpression`）与类体里的 `class K { new (a: number): I }`（TS 是 `ConstructSignature`，
  产物是 `MethodDeclaration`）。
- **可复用的判据**：**「整档放开会被门挡回来」时，答案往往是「把那一档收窄到能说清的一格」**，
  而不是「换个地方再放开一次」。第 949 轮那版挂掉的原因是「对象字面量里任何 `name(...)`」；
  这一版把条件写成两条**语法事实**（紧跟 `:` 返回类型、处在成员位），面就缩到了那一格。

**第 949 轮：第 948 轮登记的那一族量到了根上——两版修法都撤回，两条形状登进语料（缺口 0 → 2）**

第 948 轮留下的那族「**表达式位的对象字面量成员**」这一轮拆成两格，两格的根因都量清了；
**两版修法都写出来过、都被门挡回来、都按规矩撤回**（如实记读数）：

| 形状 | 根因 | 试过的那一版 | 读数 | 为什么撤回 |
| --- | --- | --- | --- | --- |
| `const v = { [K in T]: X };` | `IsMappedKeyBracket` 那条「父单元是一个 `{` 括号、且本单元是它第一个实义单元」把**值位**也放行 ⇒ 值位那个 `in` 被当成映射键的标记、`K in T` 整段收成 `TypeParameter`（TS：`ComputedPropertyName > BinaryExpression{InKeyword}`） | 拿 `Bracket.Context`（开括号那一刻算好的位置）当判据，只在它是 `"value"` 时判否 | 片段探针 **4 条 → 0 条**（那几条真修好了）；可 `coverage` **4192 → 4184**、`blocked 27 → 36`，六条**真**映射类型反过来坏（`ty-mapped` / `ty-mapped-as-remap` / `gap-r869-mapped-modifiers-comment-1` / `gap-r922-mapped-modifier-space-before-colon` / `type-mapped-modifier-in-generic` / `type-combination-adversarial`） | 多行 / 带修饰词 / 泛型实参里那几种排版，`Context` 答的是 `"value"`（第 163 轮那条注释早就记过按它筛吃过亏）——**判据不成立，不是接线没接好** |
| `const v = { new (a: number): I };` | `MethodDeclarationCloseRule` 的无体成员白名单里**没有** `ObjectLiteral`（只有 `ClassBody` / `InterfaceBody` / `TypeLiteralBody`）⇒ 这一格落到 `NewCloseRule` 手里：`new (a: number)` 收成新表达式、尾巴的 `:` 与 `I` 收成属性赋值 | 把 `ObjectLiteral` 加进那份白名单 | 片段探针 **2 条 → 0 条**；可那是**整档放开** ⇒ `coverage 4192 → 4155`、`blocked 27 → 56`、`differ 138 → 147`，e2e 六条挂（`unimplemented: expression MethodDeclaration`） | 放开的范围比要修的那一格大得多（对象字面量里任何 `name(...)` 形状都成了成员签名）——**要的是窄判据** |

**登记两条**（`xl:known-gap`，缺口 0 → 2）：
[`gap-r949-object-computed-in-name`](../cases/token/expressions/gap-r949-object-computed-in-name.ts)（缺 11 多 4）
与 [`gap-r949-object-member-new-signature`](../cases/token/expressions/gap-r949-object-member-new-signature.ts)（缺 3 多 3）。

**下一轮的入手处**（两条各一句，都是这一轮量出来的）：第一条要的是**与
`TypeLiteralCloseRule.IsTypePosition` 同一份**位置判据（或者把那一份挪进 `text-common-util`
让两边共用）——**不是第三份近似**；第二条要的是**窄判据**（只认「名字是 `new`、而且它在成员位
（前一个是 `{` / `,` / `;`）」那一格），不是把整档成员体放开。

**这一轮另一条能用的读数**：`NewCloseRule.Previous` 里「父单元是 `ObjectLiteral`」是**看得到的**
（插桩实测：`{ new (a: number): I }` 里那个 `new` 的父亲那时已经是 `ObjectLiteral`）——
所以第二条本来就有现成的位置信号，撤回的那一版挂错了地方（挂在成员体白名单上）。

**第 948 轮：缺口清单空着时的第三次普查——类型位那一侧 1202 条，量出三族、当轮收掉**
（`tmp/r948/sweep.mjs`：40 个**类型位**底样 × 每个**词的边界** × 三种 trivia
= **1202 条 TS 合法片段**，判据仍是真的门那一条 `compareSource`；读数 **9 条对不上 → 4 条**，
剩下那 4 条是**同一族**、见下面那段「留下的一族」）：

| 族 | 症状 | 根因与修法 |
| --- | --- | --- |
| **映射类型的值那一格**（`: //c` 换行 `X`） | 缺 `TypeReference` 1、多 `PropertyDeclaration` 1 | `SkipPreviousTrivia` 跳回的是**冒号自己**，而 `HasLineBreakBetween` 在 `:` 与 `X` 之间量得到那个换行（注释把它夹在中间）⇒ 判成「值类型之后的成员」⇒ `X` 被收成一条没有类型的 `Field`。TS 的 `parseMappedType` 里 `:` 之后那一段**只可能是值类型** ⇒ `field.xl.md` 的成员判据补一条：上一格是 `:` / `?:` / `?` 时这一格不是成员名（与「得有换行或 `;`」那一条**不是二选一**：那条管值类型**收完之后**，这条管值类型**自己那一格**） |
| **带符号的数字字面量类型**（`-/*c*/1` / `-//c` 换行 `1` / `- /*c*/ 1`） | 缺 `LiteralType` / `PrefixUnaryExpression` / `NumericLiteral` 各 1、多 `MinusToken` 1 | `IsSignedNumberStart` 只跳**软换行**（`SkipNextWrapSymbol`）⇒ 夹注释时判否 ⇒ `-` 留在外面当 `SymbolToken`。修成 `SkipNextTrivia`（「下一个实义单元」的统一口径）；**中间那条注释跟着搬进新节点**（`ReplaceCountAt` 是整段替换，不加进来注释就从 XML / AST JSON 两个出口里没了），软换行照旧不进 |
| **推断类型的尾随注释**（`infer C extends D//c` 换行 `? E : F`） | `InferType` 漂 1 多 1（区间跨过那条注释） | 约束段的扫描把行注释当成一格 ⇒ `SignOut` 取到注释末尾。改成 trivia **既不进约束段、也不进区间**：夹在实义单元**中间**的跟着约束段走（它们在区间里面，不加会被整段替换抹掉），**末尾**那一段留在节点外面；「约束段后面是不是 `?`」那一问同时改成跨 trivia 的口径 |

**留下的一族（登记成第 949 轮的入口，不是 `xl:known-gap`——语料里没有这个形状）**：
**表达式位的对象字面量成员**。DSL 里它由 `type` 换行那一格露出来
（`type` 换行 `A = { … };` 在 TS 那边是两条语句：`type` 一条、`A = { … }` 一条），
但**与 `type` 无关**——单独喂 `const v = { [K in T]: X };` 一样对不上：

| 片段 | TS | 产物 | 差额 |
| --- | --- | --- | --- |
| `const v = { [K in T]: X };` | `ComputedPropertyName > BinaryExpression{ InKeyword }` | `TypeParameter`（`K in T` 整段） | 缺 2 多 2 |
| `const v = { [K in T as \`get${K}\`]: X };` | 同上 + `AsExpression` + `TemplateLiteralType` | `TypeParameter` + `TypeReference` | 缺 9 多 2 |
| `const v = { new (a: number): I };` | 一条 `MethodDeclaration`（名字 `new`） | `PropertyAssignment > NewExpression` | 缺 3 多 3 |

**现状（第 947 轮（三）实测）**：`cases:tsast` 那一行是「（语料里一条都没有——缺口清单是空的）」
——**第十一次清空**，距上一次登记只隔一个 commit（第 947 轮登记的那一格当轮收掉）。

**第 947 轮登记、同一轮（二）收掉的那一格**：`new` 的被构造者是**标签模板**、
而模板后面**还接着后缀**时（`new A` 换行 `` `t` `` `.b`），token 层把整段平铺收进 `NewType`
（`[Identifier(A), String, ., Identifier(b)]` 四格），而投影那两条标签模板的判据都不成立——
0b 要求「**末尾**那一格是模板」、0c 要求「模板与后缀**已经折成**一个 `PropertyAccess`」
——剩下的 `[., b]` 于是被当成二元运算符的尾巴折成 `BinaryExpression`
（实测 `new A` 换行 `` `t` `` `.b` 缺 1 多 2、`new A[0]` 换行 `` `t${x}` `` `.b` 缺 8）。
**修法（投影一处）**：0b 的判据从「末尾那一格是模板」放宽成「**链里有一格是模板**」，
模板后面那一串交给 `chainOnto`（与 0c 同一段代码）；尾巴必须**整段都是链的续格**
（`IsChainTail`），混着运算符就整个让开。

**同一批新底样又量出两族，也是（二）当轮收掉**（`tmp/r947/gate-sweep2.mjs`：21 个标签模板底样 ×
每个相邻缝隙 × 三种 trivia = 815 条 TS 合法片段，读数 **261 条对不上 → 0 条**）：

| 族 | 症状 | 根因 |
| --- | --- | --- |
| 标签是**平铺的一条链** | `o/*c*/.tag`t`.b` 缺 3 漂 1（模板与后缀整片丢） | 那条注释把 `o.tag` 拆平了（产物是 `[Identifier(o), ., Identifier(tag), PropertyAccess(String, ., b)]`），而 0c 卡在 `kids[1]` 上（它现在是点号）⇒ 改成先**找出那一格装着模板的 `PropertyAccess`**，标签取它前面全部 |
| **点号**不在后缀链的词表里 | `new A.B` 换行 `` `t` `` `.c` 那一族 27 条 | `tagIsPostfixChain` 原来只认 `Identifier` / `PropertyAccess` / `Method` / `Bracket` / `String`，而平铺的链里点号**自己一格** ⇒ 补上点号（这一问要挡的是**运算符**） |

**仍然留着、但没登记的一族**（第 176 轮就写在 0c / 0d 的注记里：「模板单元**跟在运算符单元后面**」、
本轮不做）：`o/*c*/.tag`t` + 1`。它量的是投影**左脊柱**怎么折，与本轮这几格不是同一处。

**第 947 轮（三）再换一批底样：声明 / 语句 / 模块那一侧，量出两族、当轮收掉**
（`tmp/r947/gate-sweep3.mjs`：32 个底样 × 每个**词的边界** × 三种 trivia = **1430 条 TS 合法片段**，
读数 **2 条对不上 → 0 条**）：

| 族 | 症状 | 根因与修法 |
| --- | --- | --- |
| **类型参数表另起一行** | `type Y` 换行 `<T> = { a: T }` 缺 `TypeLiteral` / `PropertySignature` / `TypeReference` 各一、多 `ObjectLiteralExpression` / `PropertyAssignment` 各一 | 收尾期从 `=` 右边那个 `{` 回扫撞上 `Y` 与 `<T>` 之间那个换行，`IsLineBreakBoundary` 只看形状 ⇒ 答「是边界」⇒ 那个 `{` 被收成对象字面量。**解析期那一半本来就问过这一句**（`StatementBranch.Condition` 把 `IsDeclarationHeadAwaitingParameters` 排在 ASI 判据之前 ⇒ 壳一直开着）⇒ 收尾期补问**同一句**（`type-literal.xl.md` 的 `IsTypePosition`） |
| **泛型箭头的返回类型标注跨行** | `const g = <T,>(x: T):` 换行 `T => x;` 缺 5 漂 3 多 8（第一条壳停在 `:` 上、余下那段被读成一条 `Lamda`） | `Statement.IsValueArrowReturnColon` 原来只认「`)` 左边是 `=`（或 `async`）」⇒ 把第 928 轮那一档扩成**一格一格往回跳**：`async` 与**类型参数段**两格都认（两种先后都在） |

**（三）一条量法上的教训（如实记）**：这一批最初报出 **18 条**，可它**全是同一个假缺口**——
探针把 trivia 插到了**词的中间**（`Number` 被切成 `n` 换行 `Number`），量的是**另一个程序**。
把缝隙收到「**词的边界**」（前后两个字符都是 `[A-Za-z0-9_$]` 就跳过）之后那 18 条一条不剩。
**探针报 FAIL 时先问「这个片段在 TS 里到底读成什么」**（第 894 轮那条）在这里的版本是
「**这个片段还是原来那个程序吗**」。

**第 946 轮（三）登记、第 947 轮收掉的那一格，顺带推翻了那一轮的两条诊断**（如实记）：

| 第 946 轮（三）写下的话 | 第 947 轮实测 |
| --- | --- |
| 这一格是（一）（二）收掉的那一族的**补集**（`[` 后面接不上东西 ⇒ 下标留在 `New` 外面） | **不是补集**：`const a = new A` 换行 `[1]();` 在 TS 那边是**一条** `NewExpression`（`expression` 是 `ElementAccessExpression(A, 1)`）——「后面接不接得上后缀」根本不是分水岭 |
| **不是加一句判据能收的**，得把「下标归谁」挪到投影层 | **照样是加一句判据能收的**，而且是**删掉**那一句：`[` 那一支只剩「这一段下标**收好了**没有」（`IsClosedBracket`） |

TS 的口径一句话：`parseMemberExpressionOrHigher` **先整段取「构造者」**（`.` 与 `[]` 一起贪心走完、
换行也不让路），**再看末尾是不是 `(`**——那对实参括号只决定 `arguments` 挂不挂，**不决定下标归谁**。
于是 `new ns[a]` / `new ns[a]()` / `new ns[a].b` / `new ns[a][b]()` 四种排版走同一条路。
⇒ 缺口 1 → **0**（**缺口清单第十次清空**），用例 `gap-r946-new-postfix-index-without-call.ts`
按规矩撤掉 `xl:known-gap`、留着当守卫（五档排版）。

**同一把尺子换成「真门那一条」口径再量一遍**（`tmp/r946/sweep.mjs` 的 20 个底样 × 每个相邻缝隙 ×
三种 trivia = 630 条 TS 合法片段；`tmp/r947/gate-sweep.mjs` 直接调 `tests/parse/ts-ast.mjs` 的
`compareSource`，不再用「kind 序列逐位置比」那种更严的口径）：**修前 28 条对不上**
（24 条是下标那一格、4 条是「下标与模板串之间隔着换行 / 行注释」），**修完 630 条一条不剩**。
第 946 轮那句「68 条全是同一格」也要打个折：那 68 是**旧口径**的读数（它把
`TemplateTail` / `LastTemplateToken` 这种同名别名、以及字段顺序也算成对不上），
换成真门口径其中 **40 条本来是对的**。
**「探针报的条数」不等于「门报的条数」，量缺口先对齐口径。**
（`tmp/r946/sweep.mjs`、`tmp/r947/gate-sweep.mjs` 与那几份插桩都没进仓，规矩与 `tmp/r869/gen.mjs` 一族相同。）

**第 946 轮收掉的那一格**：`gap-r937-new-index-callee-newline`（`new ns` 换行 `[a]()`
在 TS 那边是**一条** `NewExpression`——`expression` 是 `ns[a]`、`arguments` 是 `()`）。
第 937 轮把 `[` 从 `NewArguments` 里放了出来（下标留给 `PropertyAccessCloseRule`），
那一半是对的；**缺的是另一半**：`[` 后面接得上一次调用时，下标**就是被构造者的一部分**
（TS 的 `parseMemberExpressionOrHigher` 先把 `.成员` 与 `下标` 整段取成构造者，再看末尾是不是 `(`）
⇒ 产物过去是 `CallExpression[ElementAccessExpression[New, a]]`。
判据落在 `NewCloseRule` 的两格新方法上（`IsClosedBracket` + `PostfixIndexRunEnd`）：
扫描遇到 `[` 时先问「这一整段下标后面那一格是不是 `(`」，是就把整段下标收进 `NewType`
（括号照旧由下一圈扫进 `NewArguments`）。**同一个问题只写一份**：
「这一段下标到哪结束」只有 `PostfixIndexRunEnd` 一处答案（第一版写成「沿列表找配对 `]`」，
实测错——内层括号成形时**已经把它吃掉了**，列表里根本没有那个符号）。
⇒ 缺口 1 → **0**，用例改名成 `token/expressions/expr-new-index-callee-newline.ts` 留着当守卫。

**第 946 轮（二）把同一批探针量出来的另外两格也收掉**：这一轮把那一问从
「后面那一格是不是 `(`」放宽成「**这一段下标后面那一格还能不能接下去**」——
`.成员` / `(` 实参表 / `[` 下标 / 模板串都是 TS 的 `parseMemberExpressionRest` 会贪心吞下去的后缀：

| 片段 | 收掉之前 | 现在与 TS 逐节点一致 |
| --- | --- | --- |
| `new ns[a].b` | `PropertyAccessExpression(ElementAccessExpression(New, a), b)` | `NewExpression > PropertyAccessExpression > ElementAccessExpression` |
| `new ns[a]`` ` `` | `TaggedTemplateExpression(ElementAccessExpression(New, a))` | `NewExpression > TaggedTemplateExpression > ElementAccessExpression` |

模板那一格还带出**投影层的一处放宽**：`print-ast-common.xl.md` 的 0b 支
（标签模板）原来要求「恰好两个单元」，而 `new ns[a]`` ` `` 的标签是**三格**
（`[Identifier(ns), Bracket([a]), String]`，`New` 把下标与模板一起收进了被构造者那一段）
⇒ 模板整格丢、投出来的 `NewExpression` 只剩 `expression`。
放宽成「末尾那一格是反引号 `String`」之后**当场撞到一条回归**
（`expr-template-tagged-in-operator`：`tag`a${x}b` === tag`a${x}b`` 的
`[Identifier(tag), BinaryOperator(String, ===, tag), String]` 也满足那句话，
于是整条比较式被收成一个标签模板）——所以那一支**必须再带一条守卫**：
模板前面那一串得是**后缀链**（`Identifier` / `PropertyAccess` / `Method` / `Bracket` / `String`），
出现运算符就不成立。带上之后两处都对。

**这一轮仍然没收的一格**（如实登记）：`new ns<T>[a]()` —— **TS 自己就把它读散了**
（`BinaryExpression(BinaryExpression(new ns, <, T), >, CallExpression([a]()))`，实测），
本仓读成 `NewExpression(ns, TypeReference(T))`：这一格量的是「两边都非法时谁更接近」，
**没有可对齐的目标形状**，按「口径边界」那一节的规矩留在门外（不是缺口）。

**第 945 轮收掉的那一格**：`gap-r941-import-attributes-newline`（`import a from "m"` 换行
`with { type: "json" };` 在 TS 那边是**一条** `ImportDeclaration`）。第 941 轮把判据写进了
`ImportCloseRule.Process`，可它**够不着**——根因在**收壳那一刻**：`Statement.IsPendingImportHead`
一看到 `String`（路径）就答「写完了」，换行处收壳，`with { … }` 于是落进另一条 `Statement`。
这一轮在「路径已经到手」那一支里补一句 `NextLineOpensAttributes`（判据本体仍是第 941 轮
那一份，从**末了那个实义单元的 `End`** 起扫），**收尾期一处未动**（实测：壳没关之后
`IsStatementEnd` 的「换行后面是 `;`」那条本来就不把这一格算成语句末）。
⇒ 缺口 2 → **1**；顺带 `xl:expect` 里的 `Keyword` 按新读数撤掉（`with` 只留成 `Import` 里的
`Identifier`，子句由 `ReadClause` 读）。

**第 944 轮收掉的那一格**：`gap-r942-loop-body-terminator`（`while (a) break` 换行 `;`
在 TS 那边是 `WhileStatement[0,17)`、体是 `BreakStatement[9,17)`——**它自己一路到那个 `;` 之后**）。
第 942 轮把根因钉在「那个 `;` 归谁」上，这一轮把它收掉：
**下一行以 `;` 开头时，换行不是语句边界**（TS 的 `parseSemicolon` 里 `canParseSemicolon()`
对分号一律为真 ⇒ 分号是**上一条语句自己的终结符**）。判据落在一格新的静态判据
`Statement.TrailingSemicolonJoins` 上，两处成形器共用（收尾期 `IsLineBreakBoundary` 手里有
那个 `;` 单元；解析期 `StatementBranch.Condition` 只有原始字符，走 `NextLineFirstCharAt`）。
**唯一的排除项是「花括号组结尾」**（`lab: {}` 换行 `;` 在 TS 那边要多一条 `EmptyStatement`，
实测 `stmt-label-block-trailing-semicolon`）——值位花括号那两档（`const o = { … }` /
`export { a }`）今天与 TS 逐节点一致，本轮按「不动已经对的那两档」处理、写在判据的说明里。
⇒ 缺口 3 → **2**；顺带两处 `Statement:N` 的期望按新读数改小
（`im-import-trailing-semicolon-next-line` / `gap-sweep-linecomment-optchain-07`：
原来那一层空壳正是「`;` 另起一条」的产物）。

**第 943 轮收掉的那一格**：`gap-r937-angle-assertion-newline`（`const a = <T>` 换行 `x;`
在 TS 那边是**一整条** `TypeAssertionExpression`，本仓原来把换行当语句边界）。
根因是**左半截那一问只问词形**：末尾那一格是 `GenericType`，而 `ExpectsOperand` 问的是
「**这个单元**期待操作数吗」——`GenericType` 自己不期待，于是「左边写完了」⇒ 换行处收壳。
修法是一格新的静态判据 `Statement.IsPendingAngleAssertion`（末尾是 `GenericType`，
且**它前面那一格**还在等一个操作数 ⇒ 这一行没写完），挂在 `IsLineBreakIncompleteOnLeft` 上
⇒ **解析期（`LineCannotEnd`）与收尾期（`IsLineBreakBoundary`）同源**，两个成形器不会漂。
同族四格一并转绿（`typeof` / `void` / `!` / `+` 之后换行）；`const a = f<T>` 换行 `g();`
与 `type X = Array<T>` 换行两档**照旧不合并**（它们前面是名字，与 TS 逐节点一致——
这正是「不能只问末尾是不是 `GenericType`」的实测依据）。
⇒ 缺口 4 → **3**（`cases:tsast` 报「3 条还开着」）。

**第 934 轮把第 933 轮登记的那 4 格全部收掉 ⇒ 缺口清单第八次清空**
（四份用例撤掉 `xl:known-gap`、留着当守卫；四格的根因各一句话写在「解析层几条硬规矩」里，
各自那一族的守卫用例见 `cases/token/{types,declarations,statements}/` 下同名的四份：
`mapped-member-after-value` / `method-generic-params-newline` / `switch-case-label-newline` /
`typeof-import-newline`）。第 933 轮那次普查（`tmp/r933/gen.mjs`：45 个构造 × 每个相邻位置 ×
`/*c*/` / 换行 = 770 条片段、755 条合法）量出这 4 格、并**当轮收掉一族**：
数组的洞 `OmittedExpression` 的位置（守卫 `expr-array-holes-trivia`）。
此前的账：第 931 轮量出 6 格、三族当轮收掉、三格登记，
**第 932 轮把那三格也收掉 ⇒ 清单第七次清空**。
**清单的条数以 `cases:tsast` 最后一行「已知缺口：N 条还开着」为准**；
口径与判据写在根 [README](../../README.md) 的「开着的缺口」那一段。
**再次强调那条口径**：清单空着只是**清单**的性质，不是语法的性质——
换一批构造再问一遍，第 933 轮一次又量出 4 格。

**这一格跟着门走**：条数以 `npm run cases:tsast` 最后一行「已知缺口：N 条还开着」为准
（第 854 轮实测 **10**：第 845 轮收掉 8 条、第 846 轮收掉 1 条、第 847 轮收掉 2 条、
第 848 轮收掉 2 条、第 849 轮收掉 1 条并新登 1 条、第 850 轮收掉 4 条、第 852 轮收掉 2 条、
第 853 轮收掉 1 条、第 854 轮收掉 1 条；第 818 轮那段分段口径写在下面，条数此后又收掉了一批。
**第 855 轮之后每一轮的收 / 登记逐条写在 [README](../../README.md) 的逐轮小节里**，
这里不再抄——第 862 轮结束时是 **5**、第 863 轮收掉 1 条、第 864 轮收掉 1 条 ⇒ **3**、
第 867 / 868 两轮把最后 3 条收干净 ⇒ **0**；
**第 869 轮做了一次新普查**（`tmp/r869/gen.mjs`：46 个较新的构造 × 每个 token 边界 ×
`/*c*/` / 换行两种变体 = 689 条小片段，片段探针 670 条合法、36 条对不上），
当轮收掉 6 处（`export * as ns` 那一族换行、`export as namespace` 四格之间的注释与名字前换行）
⇒ **0 → 30 条还开着**。那 30 条按落点立在
`tests/cases/token/{modules,types,declarations,statements}/gap-r869-*.ts`，
每组根因写在各自文件头的 `xl:known-gap` 后面，逐条的来龙去脉见根 README 第 869 轮那一节；
**第 870 轮**把其中的**类型谓词那一族 6 条**收掉（删掉各自的 `xl:known-gap` 行、用例留着当守卫）
⇒ **24 条**；**第 871 轮**再收掉 `type /* c */ T<U>` 那一族 3 条（泛型参数表认不出「这一格是声明头」）
⇒ **21 条**；**第 872 轮**收掉枚举成员初始值那一族 4 条（二元运算符两侧的操作数改走 trivia 口径）
⇒ **17 条**；**第 873 轮**再收 6 条（构造签名 / 函数类型的 trivia 口径 4 条 + 两条新的 ASI 判据：
变量声明的类型标注冒号、还在等操作数的类型词）⇒ **11 条**；**第 874 轮**收掉 `infer` 约束那一格
（`IsInsideExtendsType` 的回扫跨过注释）⇒ **10 条**；**第 875 轮**收掉三条同根的
（`import` / `export` 后面那个 `type` 词的两侧注释、`typeof` 与 `import(...)` 之间的注释）
⇒ **7 条**；**第 876 轮**收掉 `export { a }` 换行 `from "m"` 那一格
（花括号子句「自己就完整」也要看**右边那一行**）⇒ **6 条**；**第 877 轮**收掉 `export { a }` 换行 `from("m")` 那一格
（模块路径装在 `Method(name="from")` 里，`moduleSpecifier` 要找进去一层、那一格是
`ParenthesizedExpression`）⇒ **5 条**；**第 878 轮**收掉 `infer V` 换行 `extends string` 那一格
（收尾期的续接表 `Statement.ContinuesExpression` 没认 `extends`，换行被 ASI 判成语句边界
⇒ 条件类型从第二个 `extends` 起算）⇒ **4 条**；**第 879 轮**收掉 `#x` 换行 `in o` 那一格
（**解析期**的续接词表里没有 `in` / `instanceof` 两个保留字，换行被 ASI 判成语句边界）
⇒ **3 条**；**第 880 轮**收掉 `declare global` 换行 `{ … }` 那一格（「等着体的声明头」词表补
`declare`，但只认**段首**——段首要用 `SearchFrontIndexed` + `IsStatementBoundary` 划，
`SkipNextTrivia(data, -1)` 会被注释头挡住）⇒ **2 条**；**第 881 轮**把最后两格一起收掉：
`import m = ⏎ require("m")`（`ImportCloseRule.Process` 的「写完了没有」与
`Statement.LineEndsWithEquals` 对齐成一份——末了那个实义单元是 `=` ⇒ 还没写完）与
`abstract new /*c*/ () => X`（根因不在升级时序，而在 `LamdaCloseRule.IsLambdaParameters`
往左第一格只跳软换行、不跳注释 ⇒ `(` 前面那条注释让每一档都不命中、落到末尾那句「是形参表」；
那一格改成 trivia 口径，`new` 那一档顺手从「按类认」改成「按词认」）⇒ **0 条**。
**第 910–925 轮**把第 907 轮登记后余下的那 6 格逐格收完；**第 926 轮登记 1 格**
（`token/declarations/gap-return-type-fn-comment-body.ts`）、**第 927 轮收掉它**
⇒ **缺口清单第四次清空**（第 927 轮（二）登记的那一格**柯里化的返回类型**由第 927 轮（三）
收掉、用例留着当守卫；同一轮把探针量到的**下一格**——「箭头的返回类型是**带括号**的函数类型」——
按规矩登记进来，所以标题上仍是 **1 条**：`token/expressions/gap-arrow-return-parenthesized-function-type.ts`，
根因与修法见下面第 927 轮（三）那一节）；**第 928 轮把那一格连它的一族一起收掉**
（「返回类型那一格的括号与形参表同形」分不开，根因是**三处判据各自近似**，收成一份共用判据
`IsArrowReturnTypeBracket` 之后全族转绿）⇒ **缺口清单第五次清空**，下面第 928 轮那两节记着推演与实测。


**缺口清单长在语料里**：每条缺口就是 `tests/cases/token/<功能域>/` 下的一个用例文件，
文件头带一行 `// xl:known-gap <根因>`。`cases:tsast` 每趟把它们逐条真跑一遍：

- **还对不上** ⇒ 记 `KNOWN`，差额**不算进那八项**（所以 `npm run gates` 可以是绿的）；
- **已经对上了** ⇒ 报「收掉了」并**红**，逼你回来删掉那行指令——清单不许只增不减。

这一趟的结论就是门的那一行输出（`已知缺口：N 条还开着、M 条已经收掉`），
所以「还差多少」在 `npm run gates` 里直接看得见，不必回 `tmp/` 翻探针。
同一条纪律也适用于 `coverage` 那一侧（`xl:want blocked` / `differ` 的 62 条）。

**第 900 轮**：缺口清单空着的时候另开了一轮普查（`tmp/r900/probe{1,2,4}.mjs`：95 条小片段），
一次量出**三族**、当场全收掉（清单收完仍是 0 条），三族都不是新构造、而是
**同一个构造的另一种排版 / 另一种宿主**——这是「一次收一族」那条规矩的又一次验证：

- **索引签名里名字与冒号之间夹注释**（`[k /*c*/ : string]`）：`field.xl.md` 的
  `IsIndexSignatureName` 那两跳原来只跳 `LineWrap`，第二个实义单元读出来是注释 ⇒ 判据给否
  ⇒ 整条被收成字段（多 `PropertySignature` + `ComputedPropertyName`、缺
  `IndexSignature` / `Parameter` / `StringKeyword` 三格）。括号**里面**的软换行本来就没有语义，
  两跳改走 `SkipNextTrivia`（与 `type-operator` / `method-declaration` 那几处同一改法）。
  **这是「注释与软换行是同一件事」那条线的第 N 个落点**——同族的第三、第四处还在往出冒。
- **具名元组元素的 `?` 与冒号之间夹注释**（`[a? /*c*/ : string]`）：`LiftOptional` 只认
  「成员最后一格是裸 `?`」与「`TypeDefine` 的**尾巴**是 `?`」两支，`?` 落在成员**中间**时两支
  全落空 ⇒ 成员那一层留下一个 `OptionalType`，而投影按「类型段第一格是不是 `?`」量
  ⇒ `questionToken` 整格丢失（字段名 `[name,type]` vs TS `[name,questionToken,type]`）。
  改法与 `field.xl.md` 第 855 轮那一格**同源**：去兄弟里把那个 `?` 找回来
  （先认成员的 `OptionalType` 尾字符，再认平级 `SymbolToken("?")`）。
- **声明上的标签**（`lbl: function f() {}` / `lbl: class C {}` / `lbl: enum E {}` /
  `lbl: interface I {}`）：TypeScript 里这四种都是**一条** `LabeledStatement`，
  而 `LabelCloseRule` 的两个入口都只认控制流那七个词 / 七个类名——
  解析期 `LoopStatementWords`（还散着的那一格）、收尾期 `StatementStartsHere` 的类名串
  （声明**已经成形**的那一格，函数 / 类 / 枚举 / 接口 / 命名空间的收尾规则都排在标签规则前面）
  ⇒ 标签收不出来、更晚的 `TypeDefineCloseRule` 把 `:` 与整个声明收成一个类型标注
  （实测四族各缺 `LabeledStatement` + 声明本身 + 名字 + 体，多一个 `ExpressionStatement`）。
  两处名单一起补（`function` / `class` / `enum` / `interface` / `namespace` / `module` / `type`
  与对应的五个类名）——**一张表、两处问**，不是两处各写一份近似。
  加宽不会误伤类型标注：`let x: T` / `a ? b : c` 那一关挡在 `IsStatementStart` 上。

三条各补一个守卫用例（用例留着，缺口行不写——这三族是**收掉之后**才登记进语料的）。

**第 900 轮第二轮**：把「注释 / 软换行插进每一个相邻位置」这件事从上一轮的 95 条扩到 **566 条**
（`tmp/r900/probe5.mjs`：48 个较新的构造 × 每个 `@` 位置 × `/*c*/` / 换行两种 = 566 条合法片段，
**16 条对不上**）。逐族收掉 / 登记：

| 落点 | 条数 | 处置 |
| --- | --- | --- |
| `infer` 与名字之间换行（`Array<infer` ⏎ `V>`） | 4 | **收掉** |
| 类型字面量里的调用签名没有返回类型标注 | 1 | 登记（`gap-r900-call-signature-no-return-type`） |
| 箭头函数返回类型冒号后换行 | 1 | 登记（`gap-r900-arrow-return-type-newline`） |
| `infer` 约束的 `extends` 后换行 | 2 | 登记（`gap-r900-infer-constraint-newline`） |
| 泛型签名 / 构造签名 / 调用签名的返回类型那一格（`/*c*/` 或换行夹在形参表与 `:` 之间） | 5 | **待登记**（与上面第一条同根，另起一轮量） |
| 抽象方法的泛型参数表换行 | 2 | **收掉**（第 904 轮：根因不在 `MethodDeclarationCloseRule` 的扫描上，而在排在它前面的 `SignatureCloseRule` 的**泛型那一支**——守卫只跨注释不跨软换行 ⇒ 与 `(` 那一支共用 `NameOnPreviousLine`） |
| `new` 与类型实参表之间换行 | 1 | **收掉**（第 905 轮：两根——解析期 ASI 右半截的原始字符表补 `<`，`NewCloseRule.Process` 在换行后面紧跟**已成形的 `GenericType`** 时跨过去；同根的另一格 `b` 换行 `<C>d` 一并收掉并登记为守卫） |
| catch 形参与右括号之间夹注释 | 1 | **待登记** |
| 没有表达式的 `throw` 后面换行 | 1 | **收掉**（第 906 轮：TS 仍然建一个**零宽 `Identifier`** 当 `expression`，位置是**下一个实义单元**那一格——它不是报错恢复，换行那种写法 TS 一条诊断都不报；补法见 `print-ast-common.xl.md` 关键字语句那一格，与数组的洞补 `OmittedExpression` 同一先例） |
| `asserts` 与名字之间换行 | 1 | **待登记** |

**「待登记」那一栏是这一轮的余量**：量出来的落点比这一轮收 / 登记的条数多，
逐条都记在上面这张表里（谁接手下一轮，照着这一栏往下走就是，
不比再写一趟探针贵）。这一轮**只登记了三条**——条数从 0 变成 3。

**这一栏到第 906 轮已经走空**：第 903 轮收「catch 形参与右括号之间夹注释」、
第 904 轮收「抽象方法的泛型参数表换行」、第 905 轮收「`new` 与类型实参表之间换行」、
第 906 轮收「没有表达式的 `throw` 后面换行」；「泛型 / 构造 / 调用签名的返回类型那一格」
的**夹注释**半边第 900 轮第三轮收掉、**夹软换行**半边第 901 轮收掉。
**`cases:tsast` 的缺口清单第三次清空**。
表里只剩「`asserts` 与名字之间换行」那一格**没有专门的账**（那一轮量出了它、
但一直没有一份带 `xl:known-gap` 的用例，也没有再量过一次）——下一轮若要接着挖，
它是最现成的入手处。

**第 907 轮把这一格销了账，结论是「它不是缺口」**：真跑一次
`function f(x: unknown): asserts` 换行 `x is string {}`，TS 那边**报三条诊断**
（`Unexpected keyword or identifier.` 与「A type predicate is only allowed in return type
position for functions and methods.」）；合法的写法是**夹注释**那种
（`asserts /*c*/ x is string`），而它一直是绿的。也就是说这一格是**口径边界**、
进不了 `xl:known-gap`（那条账只收「TS 说得通、本仓收不出」的形状）。
第 900 轮记它时只记了「量出了它」，**没记「量的是合法还是不合法」**——
这一轮补上那句话，`probe6` 那张表的余量至此走空。**「这是错误恢复」与「这是缺口」
是两句不同的话，登记之前先量裁判自己怎么说的**（与第 906 轮那条判据同一句）。

**第 900 轮第三轮**：接着上一轮那张表往下走，收掉**签名返回类型那一格**里
**夹注释**的那一半（上面表里 5 条的下半）：

- **根因**（`signature/signature.xl.md` 的 `HasSignatureTail`）：形参表之后要看
  「跨过 trivia 是不是 `:`」，而那一跳原来写的是 `SkipNextWrapSymbol`（**只跳软换行**）
  ——夹一条注释时看到的下一格就是那条注释 ⇒ 判否 ⇒ 括号留在原地成了裸 `Bracket`
  （`CallSignature` / `Parameter` 一起丢、`Bracket` 一个都不少）。
  `Process` 那一侧早就是 `SkipNextTrivia`，所以这是「**判据与搬运两处各跳各的**」
  这个老毛病的又一格——两处对齐之后，调用签名 / 泛型签名 / 构造签名三支、
  类型字面量与接口两种宿主一起转绿（`probe5` 的失败数 16 → 13）。
- **夹软换行的那一半仍然开着**（`(a: string)` 换行 `: void`）：`SkipNextTrivia`
  跳得过那个换行，可**解析期**已经把这一行按 ASI 收成语句了，收尾期追不回来。
  账立成 `gap-r900-signature-return-newline`——它与上一轮登记的
  `gap-r900-arrow-return-type-newline` **同一根**（解析期的续接表不认识
  「`)` 之后换行接 `:`」这一档），下一轮两条一起收。
- 三个守卫用例进语料（调用签名夹注释、泛型签名夹注释、构造签名夹注释），
  外加一条缺口用例。token 语料 1484 份、缺口 4 条还开着。

**收掉的那一格根因**（`conditional-type.xl.md` 的 `FindExtendsIndex`）：
`U extends Array<infer` ⏎ `V> ? V : never` 里那个 `Array<infer V>` **没有收成 `GenericType`**
（`infer V` 里装了换行 ⇒ 尖括号那对留在原地），于是回扫在 `Array` 左边撞上**裸的 `<`**
（`SymbolToken`）⇒ `return -1` ⇒ 外层条件类型整条认不出来。改法是让回扫把
`InferType` **整段**与**没成形的尖括号 / 逗号**一起当透明——
尖括号在这里本来就只是分隔符（成形的 `GenericType` 已经被上一条整段跳过，
段的边界是 `?` / `;` / `=` 这些）。

其余九格按规矩**先登记**（`tests/cases/token/` 下的 `gap-r900-*.ts`，
每份文件头的 `xl:known-gap` 后面写一句根因），`cases:tsast` 每趟逐条真跑；
收掉一条就删掉那行指令。**清单不许只增不减**——这一轮就是它该有的样子：
收掉一格、登记三格，条数从 0 变成 3（另外六格记在上面那栏「待登记」里）。

### 第 907 轮：**换地形**再普查一次（364 条新片段，量出 17 格、当轮收掉 5 格）

第 900 轮那三趟（`probe{1,2,4,5,6}.mjs`）把「注释 / 换行插进每一个相邻位置」问遍了
**48 个构造**，收完清空之后容易读成「这一片已经没缺口了」。第 907 轮换了**那 48 个之外**
的构造（`tmp/r907/probe-r907.mjs`：47 个构造 × 每个相邻位置 × `/*c*/` / 换行两种 = 364 条）
再问一遍同一句话，**一次量出 17 格**。**「清单空了」是清单的性质，不是语法的性质。**

- **量出来的 17 格**逐条登记成 `tests/cases/token/**/gap-r907-*.ts`（各带一条
  `// xl:known-gap <根因>`，`cases:tsast` 每趟真跑），按根因分四族：
  - **`import` 那一族**（5 格，当轮全收）：类型位限定名尾巴
    （`import("m")/*c*/.A` / `typeof import("m")./*c*/A`）与元属性
    （`import/*c*/.meta.url`）——`SkipNextWrapSymbol` → `SkipNextTrivia`，**判据与搬运同一跳**；
  - **ASI 续接表那一族**（3 格）：`type T = A` 换行 `["k"]`（下标访问）、
    `tag` 换行 `` `…` ``（标签模板）、`void` 换行 `0`（一元运算符要操作数）——
    解析期的 `NextLineContinuesExpression` 表比收尾期的 `IsLineBreakBoundary` 窄；
  - **「紧跟的那一格」那一族**（6 格）：`class` 换行 `Named {}`、`<T,/*c*/>` 多一格零宽
    `TypeParameter`、`<T` 换行 `,>`、`abstract override m` 换行 `():void;`、
    `readonly` 换行 `[k:string]:number`、`case 1:/*c*/ {break;}`；
  - **区间 / 起点那一族**（3 格）：`export default 1/*c*/;`（TS 的 `end` 到下一格 token 的
    full start）、`do/*c*/ f();`（体从注释起算）、`else if/*c*/ (b)`。
- **当轮收掉的 5 格**（见根 [README](../../README.md) 第 907 轮那一节）：改法只有一句话——
  `import-type.xl.md` 的 `IsNameTailAt` + `Process` 的搬运循环、`import.xl.md` 的
  `ImportCloseRule.Previous` 两道护栏，**从 `SkipNextWrapSymbol` 改成 `SkipNextTrivia`**。
  这与第 875 轮那几格同源（「判据与搬运两处各跳各的」），也是第 817 轮那条线
  （「注释与软换行在这里是同一件事」）的又一个落点。
- **余下 12 格**就是下一轮的入手处，**照这张表往下走，不必再写一趟探针**。
  **第 908 轮接着收掉 3 格**（都在「判据只看紧邻那一格」这条线上，
  与第 907 轮那 5 格同源）：`else if/*c*/ (…)`（`IfSet.Navigate` 补一格
  「`else` + `if` + trivia + `(`」，只在当前这一格确实是 `(` 时才签）、
  `case 1:/*c*/ { … }`（根因在 `IsCaseClauseColon` 的第一跳只跳软换行 ⇒
  `BlockCloseRule` 不给块补语句队列）、`do/*c*/ f();`（`do-while.xl.md` 取体起点时
  没跳 trivia，体的区间从注释起）；**缺口 12 → 9**。
  **第 909 轮再收 3 格**（三格分别住在三层：`<T,/*c*/>` 多一个零宽 `TypeParameter`
  ——`type-parameter.xl.md` 的 `AppendSegment` 按**单元个数**判空段；
  `export default 1/*c*/;` 的区间——`print-ast-common.xl.md` 那一问没跨 trivia 找 `;`；
  `tag` 换行 `` `a${b}c` ``——解析期的 `NextLineContinuesExpression` 里没有模板串那一档）；
  **缺口 9 → 6**。

### 这 89 条长什么样（按根因分三段；下面这三段是第 818 轮实测的分段口径，条数此后又收掉了一批）

按**文件名前缀**数是这三段（第 818 轮实测）：`gap-sweep-*` 128 + `gap-<字母>-*` 17 = **145**；
`gap-r676-*` 2 + `mut-*` 9 = **11**；其余 **18**。

| 段 | 条数 | 一句话 |
| --- | --- | --- |
| **注释 / 换行落在语法相邻位置之间** | **145** | 最大的一族，按**落点**逐条立着（见下） |
| **注释夹在语法相邻的两格之间** | **11** | 同一族换了落点：类型运算符 / 函数类型 / `new` 实参括号 / 成员名与形参表 / 泛型实参段附近 |
| **其它** | **18** | 各有各的根（见下） |

**第一族（145 条）怎么长出来的**：它来自三次普查，每次都把「同一构造的**每一个 token 边界**
各插一遍 `/*c*/`、`//c` 换行、换行三种变体」——于是落点不同就各自成一条。
命名上看得见来源：`gap-sweep-{comment,linecomment,newline}-<上下文>-<序号>`，上下文有
`optchain` / `generic` / `destr` / `clsmod` / `iface` / `import` / `export` / `tpl` / `cond` /
`arrow` / `async` / `obj` / `arr` / `switch` / `try` / `label` / `ns` / `var` / `fn` / `class` /
`call` / `dowhile` / `ifelse` / `typeunion` / `gener` ……另有几小批 `gap-a-*`（A-comment）/
`gap-b-*`（B-oneline）/ `gap-c-*`（C-optchain-nonnull）/ `gap-d-*`（D-generics-tuple-mapped）/
`gap-j-*`（J-import-export）/ `gap-m-*`（M-misc）。第二族里那 9 条是 `mut-*` 探针池
（**第 816 轮收掉 4 条、第 817 轮 8 条、第 818 轮 2 条，池子从 23 降到 9**）。

**「一次收一族」在这一族上的意思**：把「注释夹在语法相邻位置之间」这条线**整个按位置过一遍**，
而不是一条一条打补丁。已经被这条线收掉的地方（对照表，说明这类缺口长什么样）：

- **声明头与它的体之间那个换行不是语句边界**（`Statement.NextLineContinuesExpression` 的
  `IsHeaderBodyBrace`）：`while (a)` 换行 `{ … }`、`for (;;)` 换行 `/* c */` 换行 `{ … }`、
  `switch (a)` 换行 `{ … }`、`function f<T>(x: T): T` 换行 `{ … }`，以及
  `import` 换行 `{ a } from "m"` 的解析崩溃。**注意**：`{` 自己起得了一条语句（裸块），
  所以判据只能认「末尾是不是一个等着体的头」，不能见 `{` 就答「续接」——
  `foo()` 换行 `{}` 在 TS 里是两条语句。
- **`export /* c */ { a as b }` 与 `export` 换行 `{ a as b }`**：`ExportCloseRule` 找子句时
  只跳软换行、不跳注释，且收集循环的第一格撞上 trivia 就 `break`
  （`SkipWrap` 与那一段收集都改成「还没有收到任何单元时跨过 trivia」）。
- **`if` / `while` / `do…while` / `catch` 四处的 `/* c */ (`**、`else` / `else if` 那一族、
  `var` 的声明头、`switch` 判别括号、`class A /* c */ extends B`、`namespace N /* c */ {`、
  `enum E /* c */ {`、`type T /* c */ =`、`const a /* c */ = 1`、`f(1, /* c */ 2)`、
  `{ get x() {} set x(v) {} }` —— 这些落点本来就是好的（探针里对上了，所以不立用例）。
- **第 817 轮收掉的那六处**（都是「相邻的那一格」没走 trivia 口径，见「解析层几条硬规矩」）：
  `keyof` / `typeof` / `readonly` / `unique` 与操作数之间（`type-operator.xl.md`）、
  函数类型的形参括号与 `=>` 之间（`function-type.xl.md`）、成员名与形参表之间
  （`method-declaration.xl.md` 的 `ParameterIndex` + `signature.xl.md` 的分工线）、
  被调用者与实参括号之间（`method.xl.md` 的 `NameIndex`）、
  `new C` 与实参括号之间（`binary-operator.xl.md` 取「括号外面那一格」）、
  以及 `for /* c */ (…)` 的头部括号。前五处是这一轮的主线，`for` 那一处随同收掉
  （`gap-sweep-*-call/fn/class/clsmod/iface` 那些条的形状也跟着变好，见各自的 `xl:expect`）。
- **第 818 轮收掉的那一处**：**只有注释的形参表**——`m(/*c*/) { … }` / `function f(/*c*/) { … }` /
  `interface I { m(/*c*/): void }` / `(/*c*/) => 1` / `private m(/*c*/) { }` 五处同形，
  收成「空形参表 + 一个零宽 `Parameter`」。根是**判空**没用 trivia 名单（见「解析层几条硬规矩」），
  改的是 `parameter.xl.md` 与 `lamda.xl.md`。
- **`catch` / `finally` 与它的体之间夹一条行注释或一个换行**（`gap-crash-try-*` 那 4 条）
  曾经是**唯一一档「产物直接抛异常」**的：`Statement.IsHeaderBodyBrace` 只认
  `while` / `for` / `switch` / `function` / `import` / `export` ⇒ 那个 `{` 没被认成体
  ⇒ `TryCloseRule` 手上的单元表里 `finally` 后面**没有** `{` ⇒ 空指针。修法两处：
  `IsHeaderBodyBrace` 收下 `catch` / `finally`；`Statement.IsDeclarationPosition` 往回跳 trivia
  （但**行注释那一格不跳**——`//` 换行是一次 ASI，块注释不是）。

**第三段（16 条）逐条**（它们不属于上面两族，各有各的根）：

| 用例 | 形状 | 症状 |
| --- | --- | --- |
| [destr-object-newline-after-keyword.ts](../cases/token/declarations/destr-object-newline-after-keyword.ts) | `const \n{ a, b: c, d = 1, ...rest } = o` | 换行落在声明关键字与解构模式之间时整条声明解体（缺 11 / 多 15）：`Let` 那一趟与 `{` 都是按「紧邻」找模式的 |
| [expr-function-expression-plus.ts](../cases/token/expressions/expr-function-expression-plus.ts) | `const r20 = function f() {} + 1` | 函数表达式后面还能接运算符，这里整段收成了别的形状（缺 4） |
| [expr-generic-instantiation.ts](../cases/token/expressions/expr-generic-instantiation.ts)、`expr-generic-inst-let`、`expr-generic-inst-statement`、`gap-d-generics-tuple-mapped-01` | `const a = f<string>;` | **泛型实例化表达式**（TS 4.7）没有规则：产物是 `BinaryExpression(f < string)`，TS 是 `ExpressionWithTypeArguments` |
| `expr-async-generic-arrow`、`-spaced`、`gap-d-generics-tuple-mapped-02` | `async <T>(x: T) => x` | `async` 与泛型段**谁先认领**没有定义（各缺 7–13） |
| [mod-declare-module-shorthand.ts](../cases/token/modules/mod-declare-module-shorthand.ts) | `declare module "mm";` | 简写形态不成形（缺 2 多 1）；**带 `{}` 的那一条是好的** |
| [stmt-label-comment-before-call.ts](../cases/token/statements/stmt-label-comment-before-call.ts) | `a: b: c: d/* c */ ()` | 标签那一趟看到的是注释，最后一层标签没接上被标的语句（缺 1） |
| [type-param-conditional-constraint.ts](../cases/token/types/type-param-conditional-constraint.ts) | `x extends A extends B ? C : D` | 约束位上的嵌套条件类型不成形（缺 10 / 字段 1） |
| `type-asserts-toplevel`、`type-param-asserts-constraint` | `type T = asserts x is A` / `<X extends asserts x is A>` | 断言谓词只在返回类型那一位成形（各缺 5 多 2）：`TypePredicateCloseRule.Previous` 的「起点」只认容器第一个实义单元与紧跟 `=>`，而 `=` / `extends` 右边同样是合法类型位 |
| [type-typeof-qualified-index.ts](../cases/token/types/type-typeof-qualified-index.ts) | `type A = typeof a.b[K]` | 点号名在产物里是平级单元，`TypeQuery` 于是吞下整个 `a.b[K]`（缺 4 漂 2 多 1）。**不带点号的** `typeof a[K]` / `typeof a[]` / `typeof a[K][L]` 已经收掉 |
| `mut-stmt-asi-return-newline-expr-115` | `function f(/* c */)` | 那条注释让 ASI 那一族的形态漂一格（多 1 字段 1） |

上表把第三段列全（`expr-generic-*` / `expr-async-*` / `type-asserts-*` 三行各含 2–4 条同族）；
第一、二段那些条不用在这里再抄一遍——逐条的根因都写在各自文件头的 `xl:known-gap` 后面。

**第 838 轮收掉的 7 条**（都在「尾分号归谁」那一条根上，见根 README 那一轮的记法）：
`decl-declare-function-trailing-comment`（第三段，已从上面那张表里拿掉）、
`stmt-generator-trailing-semicolon`（第三段，同上）、`gap-sweep-newline-obj-03`、
`gap-sweep-newline-export-01`、`gap-m-misc-0{1,2}`、`gap-a-comment-01`。
判据落在 **kind**（上一条语句自己调不调 `parseSemicolon`）而不是原文那一格字符上，
两处新出口是 `ownsTrailingSemicolon` 与 `trailingSemicolonOf`。

**第 839 轮收掉的 2 条**：`gap-sweep-{newline,linecomment}-ns-01`（第一族里的 `ns` 落点）。
根是 `ExpectsOperand` 的词表里没有 **`export`** —— 导出声明没有 ASI，前缀与声明必须在
同一个壳里。**同一张表上 `declare` 的结论相反**（它是上下文关键字、可以当标识符，
TS 那边 `declare` 换行走 ASI），那一族没修、也不在语料里，如实记在根 README 那一轮。

**第 840 轮收掉的 2 条**：`gap-m-misc-03` 与 `mod-declare-module-shorthand`（**没体的环境模块**
`declare module "mm";`）。根在 `namespace.xl.md` 的 `ScanBody` 只认「名字后面有一个 `{`」——
新加的 `ShorthandEnd` 认「名字后面没有别的东西」，那个 `;` 由**投影侧**按「没体的声明自己吃
尾分号」补进区间（`ctx.SemicolonEndOf`，与第 838 轮同一份）。**类成员修饰词折行那一族
（`gap-sweep-*-clsmod-01/03/04`）这一轮试过又整份撤回**，量到的读数与撤回的理由写在根 README
那一轮（改法只修到「区间对了」，名字与 `modifiers` 那一格在更前面，得先动「谁被认成名字」）。

**第 841 轮收掉的 5 条**：第三段里那两条 `switch`（`stmt-switch-comment-fallthrough`、
`stmt-switch-block-then-default`，已从上面那张表里拿掉）+ 三条 `gap-b-oneline-0{1,2,3}`。
两处根各差一格，都在 `typescript/tokens/statement.xl.md`：

- `LastClauseHeadIndex` 的第三条判据原来只认「段头前面紧挨着 `:`」，而上一段的体收在**块**里时
  段头前面是 `}` ⇒ 切点找不到（补一条并列：前面是 `{` 开的括号也算）；
- `IsSwitchBodyBracket` 往回走的是 `SkipPreviousWrapSymbol`（只跳软换行），
  而 `SwitchCloseRule.Previous` 认这条语句时跨的是 trivia（第 595 轮）⇒
  `switch /* c */ (a) { … }` 里体括号认不出、切壳一次不响（两处改成 `SkipPreviousTrivia`）。

**没有动语句层**：用例头原来记的「块当语句边界的改法已被否决」仍然成立 ——
放宽的只是 `switch` 体那一支（`IsSwitchBodyBracket` 早就把宿主问出来了）。
三条 `B-oneline` 的 `xl:expect` 按新形状重算，账从 **41 → 36**。

**第 842 轮收掉的 2 条**：`gap-sweep-newline-async-01` 与 `gap-sweep-linecomment-async-01`
（都在第一族里的 `async` 落点上）。根是 `keyword.xl.md` 的 `Keyword.IsUpgradable`
例外表里**漏了 `async`**：它是上下文关键字，只有紧跟 `function` 时才该升级；
值位那几格（`async;` / `x = async;` / `async(1)`）TS 那边都是普通 `Identifier`。
判据与 `override` 同一档（看后一个实义单元），箭头 / 方法那两档不靠这个单元
（`Lamda.IsAsync` 认的是 `Identifier`，方法头靠 `modifiers` 文本列），所以一个字都不误伤。
`await` 的同形缺口（裸 `await;`）**这一轮不动**，理由写在根 README 那一轮。
另补了一条守卫用例 `expr-async-identifier-value`（调用位 + 初始化位），账从 **36 → 34**。

**第 843 轮收掉的 2 条**：`gap-sweep-comment-dowhile-01` 与 `gap-sweep-linecomment-dowhile-01`
（第一族里的 `dowhile` 落点）。根在 `do-while.xl.md`：从「体」走到「`while`」的那三处
（`BodyEnd` 取体尾 / `Previous` 认形状 / `Process` 真搬）走的是 `SkipNextWrapSymbol`
（只跳软换行）—— 夹一条注释与夹一个换行在 TS 里是同一种排版 ⇒ `while` 认不出来
⇒ 整条 `do` 退回 `WhileCloseRule`（产物是「散 `do` 关键字 + 一个独立的 `While`」，各缺 6 多 2）。
三处改成 trivia 口径 + `CommentsIn` 收下跨过的注释（与 `switch` 第 595 轮同一手）。
**另外两格没做、如实留着**：`do {} while (a) b()`（TS 在 `)` 后无条件 ASI 断句，
要动语句层）与 `do x++; //c` 换行 `while (c);`（行注释自成一条只装 trivia 的壳，
还要多一层跳过）。新守卫用例 `stmt-do-while-expr-comment`，账从 **34 → 32**。

**第 847 轮收掉的 2 条**：`gap-sweep-comment-ifelse-01` 与 `gap-sweep-linecomment-ifelse-01`
（第一族里的 `ifelse` 落点）。根是**体的第一个单元不能是 trivia**（判据与踩出来的那一格
写在「解析层几条硬规矩」里）：`if` 的体是向导自己挂的，注释一到就成了体的开头 ⇒
`{ b(); }` 落成体内部的括号、`else` 一起被吞；`else` 那一侧（`else /*c*/{ … }` /
`else //c` 换行 `c();`）是同一根的第二处 —— 注释把「尾巴上最后一个实义单元」从 `else`
换成了它自己，两支撑段判据都判不到。收掉的 2 条之外，另两条守卫用例
（`st-comment-after-head` / `st-comment-holds-brace`）的 `xl:expect` 由 `IfStatement`
改成 `IfBody`（同一条根：形状变好、判定点不变），并补一条守卫用例
`stmt-if-body-regex-not-comment`（**正则不许被当成注释**）。账从 **22 → 20**。

**第 848 轮收掉的 2 条**：`gap-sweep-newline-decl-abstract-01` 与
`gap-sweep-newline-mod-declare-01`（**孤立的上下文关键字**，两条都在顶层）。
根是 `Keyword.IsUpgradable` 里漏了这一档（`declare` / `abstract` 只在后面跟着
「要被修饰的东西」时才升级，判据与 `override` / `async` 同一档，见「解析层几条硬规矩」）。
两行 `xl:known-gap` 删掉、两条 `xl:expect` 重算（`Keyword` 没了、换成 `Statement` / `Identifier`），
另补守卫用例 `decl-standalone-declare-abstract`（`;` 那一档与「换行后面还有声明」那一档）。
探针另量到同族 10 条（`declare` 换行 `namespace` / `function` / `var` / `const`、
函数体里的 `abstract` 换行 `class`……）——同一个根，一并收掉。账从 **20 → 18**。

**第 849 轮收掉 1 条、新登 1 条**：`mut-type-union-paren-object-162`（**括号里的第一个 `{`**
那一格：注释占位让「第一个」判据整条跳过）。收掉的这行 `xl:known-gap` 删掉、
`xl:expect` 由 `ObjectLiteral` 改成 `TypeLiteral:2`（同一形状的第二个 `{` 本来就是对的）。
**新登**的 `gap-type-tuple-element-literal`（元组元素位上的 `{ … }`）是**同一个入口**的另一半——
那一半（括号种类放宽到 `[`）试过、整份撤回，理由写在「被否决的改法」第 5 条。
账 **18 → 18**（收 1 登 1）。

**第 850 轮收掉 4 条**（同一条根，全是**泛型实例化表达式** `f<string>`）：
`expr-generic-instantiation` / `expr-generic-inst-let` / `expr-generic-inst-statement` /
`gap-d-generics-tuple-mapped-01`。TS 4.7 的 instantiation expression 在 TS 那边是
`ExpressionWithTypeArguments`，本工程两处各缺一半：

- **token 层**：`IsAllowedFollower` 在表达式位只放行 `(`（那是给**泛型调用** `f<T>(x)` 准备的），
  于是 `const a = f<string>;` 里那个 `<…>` 试读被判否、退回裸符号，
  投影只能读成 `BinaryOperator(f < string)`。补的是「**`>` 后面那一格接不上表达式**」那几个字符：
  `;` / `)` / `,` / `??`（`??` 左边要一个**完整的**操作数，`a < b ?? c` 在 TS 里本身就是语法错）。
  判据照旧只看配对的 `>` 后面那**一个**字符 ⇒ `a < b > c`（后面是名字）与 `f(a<b, c>d)`
  一位都没动。
- **投影层**：补一格「`Identifier` + `GenericType` ⇒ `ExpressionWithTypeArguments`」
  （`print-ast-common.xl.md` 的 `projectExpression` 第 0a 支；`typeArguments` 用现成的
  `projectTypeArguments`）。带 `(` 的那一路不受影响——`f<string>(x)` 走链 / 调用那一支，
  仍然是 `CallExpression`。

四条用例的 `xl:known-gap` 行换成「第 850 轮转绿」的说明（用例留着当守卫），
其中 `gap-d-generics-tuple-mapped-01` 的 `xl:expect` 顺带重算
（`SymbolToken:3 → 1`、`Statement:2 → 5`——那是**老读数**，第 836 轮把模板串里的语句壳收掉之后
就没再对过；这一轮修的是投影，XML 那两格不变）。
账 **18 → 14**。探针另量了同族的 9 条变体（`f<Array<string>>`、实参位 / 数组元素位 / `return` 位、
括号化、`??` 之后……），**本轮全绿**，没有新登。

**第 852 轮收掉的 2 条**（同一条根，两条都在第一族的 `optchain` 落点上）：
`gap-c-optchain-nonnull-01`（`a?.b!()`）与 `gap-c-optchain-nonnull-02`（`a?.b!.c!()`）。
根子是**「`?.` 之后那一格是「名字 + `!`」」**：产物把它收成
`NCO[Method name=""[NotNull(b, !), Bracket]]`（`-02` 是
`NCO[NotNull(b, !), ., Method name=""[NotNull(c, !), Bracket]]`），
而 `NullConditionalOperator` 的**两条折法**都只按 `name` 折一格属性访问：
`chainWithOptional` 的**第一格**支（`?.name(args)`，第 107 轮）与 `chainOnto` 的
**续格**支（`.` 后面那一格是 `Method`，第 333 / 664 轮那一族）。`name` 是空串时两句都
投出一个**名字为空**的 `PropertyAccessExpression`、`NotNull` 留在外面当兄弟 ⇒
`-01` 缺一格 `NonNullExpression`、`-02` 漂三处 + 多两格。
**第 166 轮只修了第三条路**（`NCO` 的第一格**就是** `NotNull`，即 `a?.b!`）——
同一个根长在三条路上、当年只接了一条。

修法一处：把第 166 轮那段「按 `NotNull` 折出成员、再把 `!` 套在**整条链**上」收成
`print-ast-common.xl.md` 的私有方法 `assertedMember(left, unit, ctx, questionDot)`，
三条路共用；两处调用点各添一句「`name` 是空串且**被调用者那一格是 `NotNull`** 就走它」，
外面那层调用照旧由 `projectNode(Method)` 出（只换 `expression` / `pos`，实参表没动）。
`?.` 那一格挂**内层**那个属性访问（TS 的放法）：第一格那一路传 NCO 自己的起点，
续格那一路传 `undefined`。两条 `xl:known-gap` 删掉、两条 `xl:expect` 按新形状重算
（注释行自己就是 `LineAnnotation` + `Statement`），账 **14 → 12**。

**第 853 轮收掉的 1 条**（第一族的 `arrow` 落点）：`gap-sweep-comment-arrow-01`
（`const f = (a, b) => a/*c*/;`）。**根子是「谁算最后一个单元」**：那条注释被收进
`LamdaBody > Statement` 里，于是 `Lamda` 自己的区间盖到注释末尾（`[10,26)`，
TS 的 `ArrowFunction` 是 `[10,21)`），而 `print-ast-common.xl.md` 的 `projectLetFrom`
取的是**最后一个单元的原始终点**（`endOf` 读 `range`，看不见 trivia）⇒
`VariableDeclarationList` / `VariableDeclaration` 各多一截（漂 2 多 2）。
修法：那两处改走 `stmtEndOf(view(...), ctx)`——投影层「节点终点从不含尾部 trivia」的
既有实现（第 132 轮），不另写一份往回吃注释的循环。**`stmtEndOf` 收视图、`endOf` 收字典**
（第一版直接把字典递进去，16 条探针一起报 `产物[0,NaN)`），`view(...)` 一次即可。
同族的 `const f = 1/*c*/;` 一直是好的：那条注释落在**外层 `Statement`** 里、
是 `Lamda` 的**兄弟**，这一轮补的是「落在最后一个单元**里面**」那一半。账 **12 → 11**。

**第 854 轮收掉的 1 条**（第三段里那条 `typeof` 点号名）：`type-typeof-qualified-index`
（`type A = typeof a.b[K]`）。产物那一格是**平的**：
`[TypeQuery(typeof a), ., IndexedAccessType(b, K)]`——那个 `IndexedAccessType` 的**左半边**
（`b`）才是限定名的右半、`K` 是下标，而 `a.b` 那一条支（第 83 轮）只按名字往右套 ⇒
`TypeQuery` 的区间一路撑到 `]`（缺 `IndexedAccessType` / `QualifiedName` / `TypeReference`，
`TypeQuery` 与 `Identifier` 两处漂）。修法：尾段**先按它自己的规矩投出来**
（下标 / 数组的壳与 `<X>` 实参都在里面），再沿 `objectType` / `elementType` / `typeName` / `left`
往左走到**最左边那一格名字**，把它接到限定名右边折成 `QualifiedName`、写进 `query.exprName`，
**把那一格换掉**（新私有方法 `absorbIntoTypeQuery`），外层各壳的起点跟着挪到 `typeof`。
`typeof a.b[K]` / `typeof a.b[K][L]` / `typeof a.b[K][]` / `typeof a.b<X>[K]` 四个形状一起对上。
**两处坑**：① `TypeReference` 那一支不能把递归的返回值再赋给 `exprName`——递归返回的就是
`query` 自己 ⇒ 自环，`kindsInAst` 当场 `Maximum call stack size exceeded`；
② `ArrayType.elementType` 在这一层是**一个数组**（`ArrayType` 的 `PrintAst` 走 `ctx.Each`）。
账 **11 → 10**；全语料 `ts-ast.mjs all` 退出码 **0**（143 份大库文件 × 16 片全绿）。

**第 866 轮收掉的 1 条**（第三段里那条 `do…while`，已从上面那张表里拿掉）：
[stmt-do-while-then-statement.ts](../cases/token/statements/stmt-do-while-then-statement.ts)
（`do {} while (a) b()`）。**根子是「这个单元本身算不算一条语句」**：TS 的
`parseDoStatement` 收尾无条件调 `parseSemicolon()` ⇒ `)` 后面按 ASI 断句，`b()` 是**另一条**语句；
而产物里那条壳是 `Statement.FormTail` 在**容器关闭时**收的（`;` 与 `\n` 两档都不响），
壳里 `DoWhile` 与 `b()` **并排**——`Statement.SplitShell` 的入口（头是不是语句级单元）
与标签那一支（`lbl: do … while (a) b()`）都问 `Statement.IsStatementUnit`，
而 `DoWhile` **不在那张表里** ⇒ 两处都为假 ⇒ 壳不拆 ⇒ 投影把两条语句投成一条
`ExpressionStatement`（缺 3 多 1）。

**修法一处**（`typescript/tokens/statement.xl.md` 的 `IsStatementUnit`）：把 `DoWhile` 补进表里，
**用类名判定**（`item.constructor.name === "DoWhile"`）——`statement.xl.md` 不 import
`do-while.xl.md`（与本文件里 `StaticBlock` / `NamespaceExport` 同款，避免绕出更深的环）。
**不需要**动 `SplitShell` 的尾巴右端：`;` 那一档的右端照旧借壳那一格（终结符不在 `Data` 里）。

**第 859 轮试过一次、退回来的那一版多改了一处**（尾巴那条壳的右端改成一律取尾巴自己的最后一格）——
那一处会打断 `stmt-declaration-body-trailing-semicolon` 的 `EmptyStatement`（缺 1），
而这一轮量到**只补表就够**：`tmp/r866/do-while.mjs` 那一族 **20 条探针全绿**
（`dw-then-call` / `-let` / `-if` / `-while` / `-do` / `-comment` / `-class` / `-func` / `-return`、
函数体里那一档、标签那一档、嵌套那一档，以及 `dw-body-terminated` / `-semicolon` / `-if-body` /
`-while-body` 四条**对照**——它们本来就对）。
**副作用只量到一处**：`DoWhile` 进了表 ⇒ `stmt-do-while-expr-comment` 里它**直接站在 `Root` 下**
（与 `While` / `Try` 同款），那条用例的 `xl:expect` 里 `Statement:2 → 1`（同一形状变好、判定点不变）。
账 **3 → 2**；全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、`npm run gates` **八道全过**
（coverage 4010 → **4011 / 4191**、blocked 43 → **42**）。

**第 867 轮收掉的 1 条**（第三段里那条模板字面量类型，已从上面那张表里拿掉）：
[type-param-template-literal-constraint.ts](../cases/token/types/type-param-template-literal-constraint.ts)
（`` function f<X extends `a${A}b`>(x: X): X { return x; } ``）。**根子是泛型段扫描器的字母表**：
`GenericTypeBranch.ScanArguments` 只认「类型实参字母表」，而 `` ` `` 与 `$` 都在表外
（表里明写着「其余字符一律中止」）⇒ 扫描在开引号那里当场中止 ⇒ `<X extends `a${A}b`>` 整段
**退回比较运算符** ⇒ 类型参数段认不出来、`function` / `type` / `class` / `interface` / 方法 /
箭头函数**整条塌成 `BinaryExpression`**（缺 14 多 7、还带一处未映射 `Bracket`）。

**修法**：给字母表补一条**模板字面量整段吃掉**的分支（两个私有方法，
`generic-type.xl.md` 的 `SkipTemplate` / `SkipTemplateExpression`）：

    `  →  SkipTemplate       扫到闭合的 `，途中 \ 转义、${ 交给下一层
    ${ →  SkipTemplateExpression   花括号自己计数，字符串 / 注释 / 嵌套模板各自成对吃

**`>` 必须一起吃掉**：`` `${A extends B ? C : D}` `` 里那个 `>` 若参与尖括号计数，
`<X extends `a${A}>B`>` 这类写法会**提前收尾**、类型参数段被切成两半。
**值位那一边一个字没动**：后继闸 `IsAllowedFollower`（表达式位里 `<…>` 后面必须紧跟 `(`）
照旧兜住 `a < `x` > (b)` 这种排版。

**量到的边界（这一轮实测，写在这里）**：缺口**不止约束位**——一开始以为它是「`extends` 约束」
那一格，探针一铺才发现 `function f<X extends `ab`>`（**不带插值**的模板）与
`type T<X extends `a${A}b`> = X`、`class` / `interface` / 方法 / 箭头函数**五处同根**，
而 `` let v: `a${A}b` `` / `type U = `a${A}b` `` / 形参与返回类型标注**本来就是好的**
（那些位置的 `` ` `` 不在泛型段扫描器手上）。所以这一条的名字虽然叫「约束位」，根其实在扫描器。

探针 `tmp/r867/template-type.mjs` **18 条全绿**（函数 / 方法 / 箭头 / 类 / 接口 / `type` 别名 /
联合约束 / 默认值位 / 嵌套插值，加四条对照）。账 **2 → 1**；全语料 `cases:tsast` **16 / 16 片**、
缺 0 漂 0 多 0；这一处改动让 `@types` / `typescript/lib` 里**成片的类型参数段**第一次成形
（投影节点 44940 → **64447**，全部与 TS 同 kind 同区间）。

**第 868 轮收掉的 1 条**（第三段里那条元组元素位；**缺口清单至此空**）：
[gap-type-tuple-element-literal.ts](../cases/token/types/gap-type-tuple-element-literal.ts)
（`` type T = [/* c */{ a: 1 }] ``）。第 849 / 851 / 865 轮试过三版都撤回，这一版**根子找对了**：
**`[` 自己那一位**——`type T = [{ a: 1 }]` 是元组类型、`const a = [{ b: 1 }]` 是数组字面量，
分开它们的正是 `Bracket.Context`（开括号那一刻算好，与重组时序无关）。
四处改动，缺一不可：

1. **`IsTypePosition`：`{` 的父括号是 `[` 时直接读那个 `Context`**，且**不要求「自己是第一个实义单元」**
   ——`type T = [{ a: 1 }, { b: 2 }]` 的第二个元素往回撞上的是 `,`（「其它符号 ⇒ 值位」当场判死），
   而元组元素的位由**外层那个 `[`** 决定。
2. **`DecideBracketContext` 的冒号那一支：跨过 `=` 之后撞上的冒号不是本括号的标注 ⇒ 值位**
   （第 865 轮记下的那一半，**这一轮才量清它单独并不出错**：光打它在四个文件上 XML 逐字节不变）。
   它是第 1 条的前提：`const tree: Tree = { …, kids: [{ value: 2 }] }` 里那个 `[` 必须是 `"value"`。
3. **`typeof` 后面的 `[` 要继续往前扫**：`typeof` 是那批类型位关键字里**唯一一个值位也天天出现**的
   （`typeof ([{ v: 1 }] as any)[0]`），照判 `"type"` 就把里面的 `{ v: 1 }` 收成 `TypeLiteral`
   （`exec/round711/001-call-chain-then-member` 红——**这一档第 865 轮没量到**）。
4. **两道闸**：绑定模式里的 `[`（`const { x: [{ y }] } = o` 那个 `x:` 是**重命名**冒号）走
   `IsBindingPatternBrace` 沿括号链往上问，再叠一道「外面那层花括号不是表达式括号 ⇒ 值位」；
   索引签名 / 映射类型的**键括号**（`{ [K in T]: … }`）落回老走法——它里面还能装别的 `{`
   （`@types/node/util.d.ts` 的 `O[K]["default"] extends {} ? K : never` 实测被抢成 `ObjectLiteralExpression`）。

**实测**：`tmp/r868/brackets.mjs` **34 条全绿**（元组 / 数组 / 绑定模式 / `typeof` / 索引访问 /
映射类型 / 索引签名 / 类里那一格，含四条对照）；全语料 `cases:tsast` **16 / 16 片**、缺 0 漂 0 多 0、
已知缺口 **1 → 0**；`coverage` **4012 → 4013 / 4191**（blocked **41 → 40**、differ 138、bad 0）。

**怎么收**：改完跑 `npm run cases:tsast` 看那一趟——收掉的那条会印「收掉了」，
把它的 `xl:known-gap` 行删掉、把这一条从上面的表里拿掉，门就少一条账。
**探针池仍然有用**：`node tests/parse/ts-ast.mjs --snippets <候选.mjs>` 是先量后收的第一站
（`tmp/` 不进仓库，所以它是**一次普查的现场**，不是门）；量出一条就补一个带 `xl:known-gap` 的用例，
清单与语料一起长。

**第 923 轮：把「每一处相邻位置插一条块注释」扩到整份 token 语料**
（`tmp/r923-census.mjs`：1537 份用例各自去掉 `//` 文件头当片段，在 `:` / `=>` / `)` / `]` /
`}` / `,` / `|` / `=` / `;` / `<` 十种缝上各插一条 `/*c*/` ⇒ **9787 条变异体**，
片段探针跑到 **9632 条合法 / 119 条对不上**）。这一轮收掉 16 条、**并把两条余量记在这里**：

- **收掉**：对象字面量属性值的尾随注释（`{ f: () => ({ v: 1 })/*c*/ }`）——属性终点原来取
  「最后一格的终点」，而那一格（箭头的体）自己含着注释 ⇒ TS `[12,31)` vs 产物 `[12,36)`。
  改法是把终点取成**值那一格投影出来的 `end`**（它已经过 `stmtEndOf` 剪过 trivia，
  与第 132 / 853 轮在语句族与 `Let` 上用过的同一条）。守卫用例
  `token/expressions/expr-object-value-trailing-comment-range.ts`。119 → **103**。
- **余量一：混合比较链的结合性**。`const b = x == y < z`（**没有任何注释**，不是变异体才有的形状）
  本仓给 `(x == y) < z`、TS 给 `x == (y < z)`（实测缺 `BinaryExpression "y < z"`、
  多 `BinaryExpression "x == y"`）。**token 树是对的**（XML 里就是 `==` 套 `<` 那一层），
  错在**投影**：`BinaryOperator.PrintAst` 只把「平级的 `SymbolToken` 运算符」当运算符，
  嵌着的那个 `BinaryOperator`（`op="<"`）被当成**操作数** ⇒ `left = Expression([x])`、
  右边再折 ⇒ 折出一个 TS 不会造的树。**排除过的改法**：把 `EqualityInstance` 换到
  `RelationalInstance` 前面（`parse-pipeline.xl.md` 的通用队列次序）——实测
  `x == y < z` 一个字不动，反倒把本来是绿的 `const c = x < y in z` 打红（`in` 那一格
  要的是「关系层先折」）。所以病在投影那一层，`operatorRank` 的分档（`==` 是 6、
  `<` / `in` / `instanceof` 是 7）**是对的**，不要动它。
  **第 925 轮更正**：上面这几句量的是**带结尾换行**的现场。把触发条件量窄之后，不带结尾换行时
  **token 树本身就是错的**（XML 里是 `<` 套 `==`），错在 `IsValuePositionOperator` 那一格——
  见下面第 925 轮那一节；投影那一层（`operatorRank` / `PrintAst`）照旧一个字不用动。
- **余量二：返回类型里「括号 + 注释 + 箭头」**。`class E { on(): ()/*c*/ => void { return; } }`
  缺 `FunctionType` / `VoidKeyword` / `ReturnStatement`，多出 `ParenthesizedType` 与一个孤立的
  `return`。问出来的次序是：`TypeDefineCloseRule` 先把 `()` 收进 `TypeDefine`（同一个单元里），
  于是 `FunctionTypeCloseRule` 再也看不到「`(` 与 `=>` 同层」这一步——**注释把两格拆到了两个单元里**。
  不夹注释时（`on(): () => void { }`）`FunctionType` 先折、一切正常；同一份里
  `const f: ()/*c*/ => void = …` 与函数的**参数**位（`on(fn: (p: number)/*c*/ => void)`）都是绿的，
  所以只有「**方法 / 函数的返回类型**」这一个宿主。**排除过的改法**：
  `method-declaration.xl.md` 的 `IsTypeContinuationBefore` 由 `SkipPreviousWrapSymbol`
  改成 `SkipPreviousTrivia`——9787 条变异体的失败数一格没动（119 → 119），已撤回。
  入口在 `TypeDefineCloseRule` 与 `FunctionTypeCloseRule` 的**次序**上，不在这一格。
  **第 926 轮更正**：入口不在那两条规则的次序上（它们本来就对，`FunctionType` 在前），
  而在 **`ParenthesizedTypeCloseRule.IsFunctionParameterList` 第 1 条判据的口径**上；
  主半那一轮收掉，**体**那一半还开着并已登记成用例——见下面第 926 轮那一节。

**第 924 轮：标签表体检把上一轮那条用例逮住——投影层的 kind 名不许写进 `xl:expect`**
（`cases:check` / `cases:tags` 从第 923 轮（二）起就是红的，这一轮收掉）

- **逮住的是什么**：`token/expressions/expr-object-value-trailing-comment-range.ts` 那一行
  `xl:expect PropertyAssignment,Lamda,ObjectLiteral` 里的 `PropertyAssignment` 是**投影层的 kind**
  （`object-literal.xl.md` 的 `PrintAst` 给 `properties` 那一格的名字），产物 XML 里根本没有它
  ——产物里属性就是平级的 `Identifier` + `:` + 值这三格，没有包装类。于是 `cases:check` 报的是
  「标签不在标签表里」（像把名字写错）、`cases:tags` 报「expect PropertyAssignment，产物里 0 个」：
  **两条红都不是解析器的缺口**。
- **为什么没被拦住**：`GHOST_TAGS` 那片「只属于 TS 形状投影的 kind」当时只有 6 个名字
  （`MetaProperty` / `TemplateHead` / `TemplateMiddle` / `TemplateTail` / `AssertClause` / `AssertEntry`），
  `PropertyAssignment` 不在里面 ⇒ 诊断落在含糊的那一句上。这一轮把它**补齐成整片**：
  `build/ts/typescript/` 下每个 `.js` 里的 `kind: "X"` 共 **71** 个，与 `dist/ts` 里 **282** 个类名
  （`ToXmlString` 取的就是类名，见 `token.xl.md`）取差集 ⇒ **59** 个，其中 4 个本来就在表里，
  补进余下 **55** 个 ⇒ 幽灵标签 **12 → 67** 种，一个都没漏进产物。以后 `xl:expect` 里写 TS 那边的
  kind 名，报的是「永远不进产物、只能写进 `xl:absent`」这一句真因。
- **那一条用例改成什么**：`ObjectLiteral:2,Lamda:1,LamdaBody:1,LamdaParameters:1,Bracket:1,AreaAnnotation:1`
  ——钉的是「那条注释落在箭头体里、值位那层括号还在」这条形状；**区间那一半照旧由 `cases:tsast`
  拿 TS 的 AST 对拍**（token 语料 1529 条全绿），`xl:expect` 从来量不了区间。
- **账**：`cases:check` 1542 条 0 不合格；`cases:tags` 1475 条带期望（5122 条断言）0 不一致；
  `npm run gates` **九道全过**；coverage 4139 / 4308、blocked 39、differ 130、bad 0（一格没动）。

**同一轮顺带量清的两件事**（都是片段探针量出来的；`--snippets` 的片段要写 `{ id, src }`，
写成 `{ name, source }` 会拿空串去比、整批误报绿——这一轮先在这种假绿上绕了一圈）：

- **余量一（混合比较链）的触发条件比记的窄**：它**只在「这条链是文档最后一条语句、且文档没有
  结尾换行」时出现**——`const b = x == y < z`（无结尾换行）缺 `y < z`、多 `x == y`；
  同一个片段末尾补一个换行、或补 `;`、或后面再跟一条语句，**三种写法都能对上 TS**。
  所以语料里那条 `expr-comparison-chain-mixed.ts`（文件以换行收尾）一直是绿的，
  第 923 轮那次普查量到的正是「片段丢了结尾换行」的那一面。
- **余量二不挑结尾**：`class E { on(): ()/*c*/ => void { return; } }` 有没有结尾换行、
  后不后面跟语句，**三档都复现**（缺 `FunctionType` / `VoidKeyword` / `ReturnStatement`，
  多一个 `ParenthesizedType` 与一个孤立的 `return`），它才是那个更硬的入口。

**第 925 轮：余量一收掉——「值位容器」不止 `Statement`**（第 924 轮把触发条件量窄之后才找到的根）

- **触发条件比原来记的窄**：`x == y < z` 这样的混合比较链**落在文档 / 块的最后一条语句、
  且文档没有结尾换行**时才错。语料里每份文件都以换行收尾，所以第 889 轮那条
  `expr-comparison-chain-mixed.ts` 一直是绿的；第 923 轮普查把片段的结尾换行丢了才把它量出来。
- **根不在投影，在 `IsValuePositionOperator`**：这几格单元这时候**还没被包进 `Statement`**，
  直接挂在 `Root`（块里最后一条则挂在 `IfBody` / `MethodBody` / `LamdaBody` / `ForBody` /
  `WhileBody` / `TryBody` / `NamespaceBody` / `FunctionBody` …）上。旧判据只认
  `Statement` / `EnumMember` ⇒ `<` 判否 ⇒ `RelationalInstance` 让开 ⇒ `EqualityInstance` 先折
  ⇒ 整条链成 `<` 套 `==`（缺 `y < z`、多 `x == y`）。**XML 里就已经错了**，投影只是照着投。
- **修法**：那一句换成 `BinaryOperatorCloseRule.ValuePositionContainers` 表——`Statement` / `Root` /
  各种体（`StaticBlock` / `SwitchStatement` 也在内）；**类型位的三个体刻意不列**
  （`InterfaceBody` / `TypeLiteralBody` / `EnumBody`）。那三个名字第 925 轮也塞进去试过，
  探针一条没动（类型位那一支确实不会被问到）——所以它们是**安全栏**，不是实测必需的一格。
- **守卫用例**：`token/expressions/expr-comparison-chain-mixed-eof-no-newline.ts`
  （**文件末行没有换行符**，与 `stmt-eof-no-trailing-newline-*` 同一个做法）。
  去掉修法它红（缺 1 多 1）；探针 `tmp/r925/eof-chains.mjs` **12 条全绿**、
  `tmp/r925/containers.mjs` **14 条全绿**（各种体 + 类型位对照）。
- **一处已量到的副作用**：`expr-arrow-body-nested-ternary.ts` 里那一格裸 `<`
  （箭头表达式体里三元条件的左边）现在由 token 层折成 `BinaryOperator`（原来留平、由投影折）
  ⇒ XML 多一个节点，**投影结果不变**（cases:tsast / astjson 都绿）。
- **账**：`npm run gates` 九道全过；coverage **4139 / 4308 → 4140 / 4309**、blocked 39、differ 130、bad 0；
  cases:astjson 36614 个节点（新增那条用例 + 上面那处副作用）。

**第 926 轮：余量二的主半收掉——括号那一侧也要走 trivia 口径**（**体**那一半还开着，已登记成用例）

- **根**：`on(): ()/*c*/ => void` 里那条块注释把 `ParenthesizedTypeCloseRule.IsFunctionParameterList`
  的第 1 条判据（「括号后面紧跟 `=>`」）挡在门外——那一条用的是 `SkipNextWrapSymbol`（只跳软换行）。
  于是 `()` 先被收成 `ParenthesizedType`，`FunctionTypeCloseRule` 再往左看时看到的不再是 `Bracket`
  （它的第 2 条判据查的就是 `Bracket`）⇒ 整条函数类型不成形（缺 `FunctionType` / `VoidKeyword`，
  多一个 `ParenthesizedType`）。注意折 `()` 的是 `ParenthesizedTypeCloseRule`，不是
  `TypeDefineCloseRule`——第 923 轮怀疑的「两条规则的次序」实测本来就对。
- **修法**：那一条改走 `SkipNextTrivia`。这与第 817 轮在 `FunctionTypeCloseRule.Previous`
  （`=>` 往左看）上补的是**同一件事的两半**，口径也同一条（第 873 轮：
  「夹一条注释与夹一个软换行是同一件事」「判据跨过什么，别处就得跨过什么」）。
- **量到的收益**（探针 `tmp/r926/flip-probes.mjs` 14 条：修前 **7 条红**、修后 **2 条红**）：
  红转绿的是**无体**的五个宿主——`interface I { on(): ()/*c*/ => void; }`、
  `declare function g(): ()/*c*/ => void;`、`abstract class A { abstract on(): ()/*c*/ => void; }`、
  `type O = { on(): ()/*c*/ => void };`、`class E { on(): ()/*c*/ => void; }`；
  另外 `type T = ()/*c*/ => void;` / `const f: ()/*c*/ => void = …` /
  `class E { f = (a: number)/*c*/ => a; }` / 参数位 / `new ()/*c*/ => void` 本来就绿。
- **还开着的余量（第 927 轮收掉第 1 条，第 2 条仍在）**：
  1. **体那一半**：宿主是**空形参 + 带体**的方法 / 函数时，体里的语句不再被包进 `Statement`——
     `return;` 投成裸 `Identifier` + `SemicolonToken`（缺 `ReturnStatement`）、
     `const a = 1;` 缺 `VariableStatement`、`f();` 缺 `ExpressionStatement`（空体 `{ }` 当然没事）。
     修前 缺 3 多 3、修后 **缺 1 多 2**（少的那两格正是这一轮收掉的 `FunctionType` / `VoidKeyword`）。
     **为什么只有空形参犯**：非空形参那一支早就被第 3 条判据（括号里顶层有 `TypeDefine`）拦住了，
     只有空 `()` 会走到第 1 条。守卫用例 `token/declarations/gap-return-type-fn-comment-body.ts`。
     **第 927 轮收掉**（根因在上面第 927 轮那一节：`IsFunctionTypeArrow` 往回那三格的口径）。
  2. **柯里化那一格**：`type T = ()/*c*/ => () => void;` 与接口里的同形（探针 `k-curry` / `l-iface-curry`）
     仍缺里层的 `FunctionType` / `VoidKeyword`（修前 缺 2 / 缺 3，修后都是 **缺 2**）。
     **第 927 轮量清了它与注释无关**：`type T = () => () => void;`（一句注释都没有）同样
     缺 2 多 1（缺里层的 `FunctionType` + `VoidKeyword`、多一个裸 `Bracket`），
     换行夹在 `()` 与 `=>` 之间也一样 ⇒ 病在**投影**：`function-type.xl.md` 的
     `PrintAst` 把「形参表 + `=>` + 返回类型」**整段收在同一个 `FunctionType` 节点里**
     （那一节写着「柯里化的函数类型整段收进同一个节点即可」），于是返回类型那一格是
     `ctx.TypeOf([Bracket, SymbolToken(=>), Keyword(void)])` —— 平铺的三格，
     `projectTypeExpression` 不认这形状（投出那个裸 `Bracket`、`void` 整格不见）。
     修法在**投影那一层**（元 `typeOf` 里给「平铺的 `( … ) => T` 段」补一支），
     与 token 层的折叠次序无关；**还没做**，第 927 轮（二）把它铺成了
     `xl:known-gap` 用例 `token/types/gap-fn-curried-return.ts`。
- **账**：`npm run gates` 九道全过；coverage 4140 / 4309 → **4141 / 4311**
  （blocked 39 → **40**，多的那一条正是登记的余量）、differ 130、bad 0；
  cases:check 1545 条 0 不合格、cases:tags 5134 条断言 0 不一致。
  守卫用例 `token/types/type-fn-return-comment.ts`：**去掉修法它红**（缺 2 多 1），修后逐节点与 TS 一致。

**第 927 轮：体那一半收掉——`IsFunctionTypeArrow` 往回那三格也要走 trivia 口径**（缺口清单第四次清空）

- **症状与上一轮记的不同**：登记的是一条「体里的语句不包 `Statement`」，可它**不在折叠那一趟**——
  按上一轮那句「被折叠挤掉了」去找，量到的是 `IsFunctionTypeArrow`（`text-common-util.xl.md`）
  的 **1、2 两条判据与那个循环**都只跳软换行：`=>` 往左第一格是那条注释 ⇒ 第 1 条
  （「左边是 `( … )` 括号」）判否 ⇒ 它答「这不是函数类型的箭头」。
- **这一次量到的是「谁在问它」**：`IsObjectLiteralBrace` 里 `void` 那一格要问
  `IsValuePositionPrefix`（第 727 轮补的：`void` 同时是类型位的词，不能无条件进豁免名单），
  而 `IsValuePositionPrefix` 往回扫撞上 `=>` 时**把结论交给 `IsFunctionTypeArrow`**
  ⇒ 链子一路传到「那个 `{` 是不是对象字面量」。于是一条注释的代价是：体的 `{` 被认成
  **值位花括号** ⇒ `Statement.FormFrom` / `StatementBranch` 两处在「值位花括号」那一格早退
  ⇒ `return;` 只剩裸 `Keyword` + 裸 `SemicolonToken`（缺 `ReturnStatement` 1、多 2）。
  **插桩量法**（`build/ts` 里那两份编译产物上打日志、`XL_DBG=1`）：`FormFrom` 打到
  `owner=Bracket … -> return: value brace`、`DecideBracketContext` 两边的单元列表**逐格相同**
  —— 差别不在平列表上，而在**问出来的那几格答案**里。这一条比上一轮的「次序」更值得记：
  **同一条链上的第二问、第三问没人过一遍时，第一问修好了症状也不动。**
- **修法**：`IsFunctionTypeArrow` 三处 `SkipPreviousWrapSymbol` → `SkipPreviousTrivia`
  （`=>` 往左看形参表、形参表往左看 `:` / `=`、`=` 之后往回找声明词）。
  与第 926 轮在括号那一侧补的是**同一件事**，也与第 817 轮在 `FunctionTypeCloseRule.Previous`
  上补的那一格同源 —— 三处问的都是「这个 `(` 是不是函数类型的形参表」，
  口径必须是同一条（第 873 轮：「夹一条注释与夹一个软换行是同一件事」；
  第 875 轮：「同一个『左边那一格』的判据…**只能有一份实现**」）。
- **量到的收益**（探针 `tmp/r927/probe.mjs` 12 条：修前 6 条红、修后 **1 条红**）：
  红转绿的是**带体**的五档——类方法、`function`、`{ return 1; }`、`{ a(); b(); }`、
  `{ const a = 1; f(); }`（体里的语句重新包上 `Statement`）；无体那几档与
  `void { … }` 值位那两档照旧全绿（`t-param-then-comment-before-paren` 也绿：
  注释夹在返回类型冒号与形参表之间同样收得住）。
- **还开着的**：柯里化那一格（上一节第 2 条），**与注释无关**，病在投影 —— 换地形量出来的，
  见下面第 927 轮（二）那一节；这一轮把它铺成了 `xl:known-gap` 用例
  （`token/types/gap-fn-curried-return.ts`）。
- **账**：`npm run gates` 九道全过；`cases:tsast` 缺口 **1 → 0 条还开着**
  （登记的用例转绿、`xl:known-gap` 按规矩撤掉、用例留着当守卫，并补 `xl:expect Statement:1`）；
  coverage **4141 / 4311 → 4142 / 4311**（blocked **40 → 39**：那条缺口转绿）、differ 130、bad 0。

**第 927 轮（二）：顺着同一条线再收两格——「第二段箭头」那一族与第 927 轮开头量到的那一格**

上一节收工时留下两条「与注释无关」的余量（柯里化的返回类型、以及顺着探针翻出来的
`type /*c*/ T = () => void;`）。这一轮把它们各自量到**层**，然后一收一登：

- **`type /*c*/ T = () => void;` 病在解析期**（不是投影）：`IsTypeAliasAssignment`
  （`lamda.xl.md`）往左只跳 `LineWrap` / `GenericType` ⇒ 撞上那条 `AreaAnnotation` 就
  `return false`（「这不是类型别名的等号」）⇒ `IsLambdaParameters` 判「这是形参表」⇒
  `FunctionTypeCloseRule.Previous` 拿到 `FindParameters >= 0` 就把整段函数类型让了出去
  ⇒ **token 树里一个节点都不成形**（`TypeAssign` 底下是平的 `Bracket` / `=>` / `void`）。
  修法与第 927 轮同源：那一格也走 `IsTriviaUnit`。守卫 `token/types/type-fn-alias-comment.ts`。
- **箭头函数的返回类型是函数类型那一格**（`const f = (): () => void => { return; };`）
  有**两根**，一根在折叠、一根在回扫：
  1. `FunctionTypeCloseRule.Process` 的收集循环里 `=>` **一律不终止**（那一句的口径是
     「柯里化的函数类型整段收进同一个节点即可」）——于是内层那个 `FunctionType`
     从左括号一路收过 `void`、**外层 `=>`**、直到函数体（实测产物是一个 `[14,39)` 的
     `FunctionType`：缺 `ArrowFunction` / `EqualsGreaterThanToken` / `Block` / `ReturnStatement`）。
     判据只差一格：`=>` 往左（跳 trivia）**是不是形参表那个 `(`**——是 ⇒ 柯里化的下一段（继续收）；
     不是 ⇒ 类型到此为止（`void => x` 根本不是类型）。
  2. 修完第一根，体那个 `{` 又被收成 `TypeLiteral`：`type-literal.xl.md` 的 `IsTypePosition`
     从体那个 `{` 回扫，**跨箭头**那个状态（`crossingArrow`）原来见到 `(` 就清掉 ——
     而这里回扫先撞上**外层** `=>`、再撞上**内层** `=>`（返回类型自己那段函数类型），
     内层那个 `(` 把状态清早了 ⇒ 状态熄灭之后撞上的是**外层箭头的返回类型冒号** ⇒ 判类型位。
     修法是**数箭头**（`arrowsCrossed`）：叠着几条箭头就等几个形参表，只有最外面那条的
     `(` 才结束「跨箭头」。
  - 守卫 `token/expressions/expr-arrow-return-function-type.ts`（修前缺 `Block`、多 `TypeLiteral`）。
  - **量到的收益**（探针 `tmp/r927/probe4.mjs` 5 条：修前 2 红、修后 **0 红**；
    `tmp/r927/probe5.mjs` 15 条：修后 **13 绿**——只剩柯里化那两条形状）。
- **仍然开着的一格**：柯里化的返回类型（`type T = () => () => void;`）——
  token 层按设计把整段收在**同一个** `FunctionType` 里（上面那一句口径没变），
  于是返回类型那一格交给 `ctx.TypeOf` 的是**平铺**的 `Bracket` / `SymbolToken(=>)` / `Keyword`
  三格，而 `projectTypeExpression` 不认这形状（投出那个裸 `Bracket`、`void` 整格不见）。
  **修法在投影那一层**（给元 `typeOf` 里「平铺的 `( … ) => T` 段」补一支），
  这一轮**没做**，按规矩登记成 `xl:known-gap`：
  `token/types/gap-fn-curried-return.ts`（`cases:tsast` 报「1 条还开着」）——
  **第 927 轮（三）收掉**（那一支补上了，见下一节）。
- **账**：`npm run gates` 九道全过；coverage **4142 / 4311 → 4144 / 4314**
  （blocked **39 → 40**：新登记的那一条进分母；differ 130、bad 0 没动）；
  `cases:check` **1548** 条 0 不合格、`cases:tags` **5145** 条断言 0 不一致、
  `cases:astjson` 36717 个节点六项全 0。
- **可复用的判据**：**「与注释无关」是一条很有用的分诊线**——它把「trivia 口径」那条线排除掉之后，
  剩下的根只可能长在**折叠时序**或**投影**上，而这两层各有各的探针（`--snippets` 看四方向、
  `cjcli` 看 XML）。这一轮三格（`IsFunctionTypeArrow` / `IsTypeAliasAssignment` /
  `crossingArrow`）全都是「往回走的那一格少跳了一种 trivia 或少数了一层」。

**第 927 轮（三）：柯里化那一格收掉——平铺的 `( … ) => T` 段要投成里层那个 `FunctionType`**

- **症状与「层」**：`type T = () => () => void;` 缺里层的 `FunctionType` + `VoidKeyword`、
  多一个裸 `Bracket`。**token 树是对的**（按设计：`(a: A) => (b: B) => C` 整段收进**同一个**
  `FunctionType` —— 那正是上面「`=>` 只在左边是形参表时继续」那一句），错在**投影**：
  `FunctionType.PrintAst` 把「返回类型」那一格交给 `ctx.TypeOf`，而那里收到的是
  **平铺**的 `Bracket` / `SymbolToken(=>)` / 类型 三格，`projectTypeExpression` 不认这形状
  ⇒ 那个 `(` 当裸 `Bracket` 投出去、`void` 整格不见。
- **修法**：`projectTypeExpression` 里补一支「平铺的 `( … ) => T` 段」——把
  `FunctionType.PrintAst` 那一份 `{ kind, props }` 抽成共享层的 `functionTypeProps`
  （`print-ast-common.xl.md`，经 `ctx.FunctionTypeProps` 取用），两处共用一份实现
  （第 875 轮那条纪律：同一个判断只能有一份实现）。
- **落点必须排在联合 / 交叉那一支**前面**：`() => A | B` 在 TS 那边是
  `FunctionType(type = UnionType[A, B])`（`=>` 比 `|` 松），先按 `|` 切就会拆成
  `UnionType[FunctionType(() => A), B]`——**两层的方向反了**。探针里 `d-comment-inner`
  （`type T = () => ()/*c*/ => void;`）与 `e-tuple-arrow`（`type T = () => (a: number) => void;`）
  钉的就是这一族。
- **量到的收益**：探针 `tmp/r927/probe3.mjs`（柯里化 5 条）**修前 5 红、修后 0 红**；
  `tmp/r927/probe5.mjs` 从 1 红变 **14 绿**（只剩下面新登记的那一格）。
- **按规矩撤账 + 新登记**：`token/types/gap-fn-curried-return.ts` 转绿 ⇒ 删掉那行
  `xl:known-gap`、用例留着当守卫（补 `xl:expect`）；同时把探针里量到的**下一格**登记成缺口
  `token/expressions/gap-arrow-return-parenthesized-function-type.ts`
  （`const k = (): (() => void) => { return; };`：括号里那段函数类型的 `(`
  被 `FunctionTypeCloseRule` 当成外层箭头的形参表——`ParenthesizedTypeCloseRule.IsFunctionParameterList`
  第 1 条只看「括号后面紧跟 `=>`」⇒ 整条箭头连体一起被吞；缺 6 / 多 6）。
- **账**：`npm run gates` 九道全过；coverage **4144 / 4314 → 4145 / 4315**
  （blocked 40 没涨：收掉一条、登记一条）、differ 130、bad 0；
  `cases:check` **1549** 条 0 不合格、`cases:tags` **5150** 条断言 0 不一致、
  `cases:astjson` 36744 个节点六项全 0。

**第 928 轮：登记的那一格连着它的一族一起收掉——「返回类型那一格」与「形参表」同形，判据收成一份**

第 927 轮（三）登记的那一格是 `const k = (): (() => void) => { return; };`：外层那个 `(`
被 `FunctionTypeCloseRule` 当成外层箭头的形参表 ⇒ 整条箭头连体一起被吞
（缺 `ArrowFunction` / `ParenthesizedType` / `Block` / `ReturnStatement`、多一个吞掉函数体的
`FunctionType`）。**它不是一个孤例**——同一族在片段探针 `tmp/r928/probe1.mjs` 里量出 **6 条**
（括号里是函数类型 / 联合 / 再套一层括号；形参表非空；体是表达式），**一个根**：

- **根因：三个地方各自近似地回答同一个问题**「`=>` 左边那个括号是不是形参表」——
  `LamdaCloseRule.FindParameters`（`=>` 左边那一段是不是形参）、`IsFunctionTypeArrow`
  （`=>` 后面的 `{` 是**块**还是**类型字面量**）、`TypeLiteral.IsTypePosition`
  （从体那个 `{` 回扫、跨箭头时那一格要不要结束「跨箭头」）。
  三处都只看**括号左边那一格**（`:` ⇒ 类型标注 ⇒ 判否），而**返回类型那一格的左边
  与形参表的左边长得一模一样**（`( 形参 ) : ( 返回类型 )`），于是：
  `FindParameters` 给 `-1` ⇒ 函数类型把整段吞掉；`IsFunctionTypeArrow` 答「函数类型的箭头」
  ⇒ 体那个 `{` 被收成 `TypeLiteral`；`IsTypePosition` 在返回类型那个括号上把
  「跨箭头」状态清早了 ⇒ 接着撞上返回类型的冒号 ⇒ 同样判成类型位。
- **分开两者的判据只有一格**（这一轮量出来、写进 `text-common-util.xl.md` 的
  `IsArrowReturnTypeBracket`，三处共用**同一份**——第 875 轮那条纪律）：
  ① 往前（跳 trivia）是 `:` / `?:`；② 那个冒号往前（跳 trivia）是一个 `(` 括号；
  ③ **括号里装的不是形参表的形状**——空 / 只有 trivia / 顶层有 `TypeDefine` ⇒ 形参表。
  第 ③ 句是关键，它分开的正是这一对同形写法：

      const k = (): (() => void) => { return; };   // 括号里是 FunctionType ⇒ 返回类型
      const f = (): () => void => { return; };      // 括号是空的 ⇒ 那是返回类型里那个函数类型的形参表

  **只看左边分不开**（两处的 `:` 左边都紧接着形参表），括号里装的是类型还是形参才是真的不同。
  第 927 轮那两格（`arrowsCrossed` 数箭头、`FunctionType.Process` 的 `=>` 续接）**一个字没动**：
  它们的形状（`(): () => void =>`）里那个括号是**空的**，第 ③ 句判否，走的是原来的路。
- **顺带收掉半格**：`IsWrappedByTypeContext` 的 `at <= 0` 原来一律答否，于是
  `const k6 = (): ((() => void)) => { … }` 里**最里层**那对括号问不出「包着我的是类型位」
  ⇒ 那段函数类型被收成 `Lamda`（多一个 `ArrowFunction`、缺 `FunctionType`）。
  改成**往上追问一层**（`return this.IsWrappedByTypeContext(wrapper)`）即成立——
  外层括号在它自己那一层的位置由同一段扫描回答（`:` ⇒ 类型位），
  而 `((a) => b)` 这种值位嵌套会一路问到顶、得到否。
- **按规矩撤账 + 登记守卫**：`token/expressions/gap-arrow-return-parenthesized-function-type.ts`
  转绿 ⇒ 删掉那行 `xl:known-gap`、用例留着当守卫（补 `xl:expect`）；同族另立一份守卫
  `token/expressions/expr-arrow-return-parenthesized-family.ts`（联合 / 嵌套括号 / 非空形参表 /
  表达式体四条，第 900 轮那条「一次收一族、收完登记进语料」的规矩）。
- **账**：`npm run gates` 九道全过（墙钟 **34.0s**）——`cases:tsast` **缺口清单第五次清空**、
  四方向 / 未映射 / 缺 range / 越界 / 抛异常全 0；coverage **4145 / 4315 → 4147 / 4316**
  （blocked **40 → 39**：收掉一条、新守卫不进分母；differ 130、bad 0）；
  `cases:check` **1549 → 1550** 条 0 不合格、`cases:tags` **5150 → 5164** 条断言 0 不一致、
  `cases:astjson` **36744 → 36868** 个节点六项全 0。
- **可复用的判据**：**「同一个问题被三处各答一遍」是这一族真正的病**——三处各自的近似
  在**大多数排版上恰好一致**，所以只有换一种排版（这里是把返回类型加上一对括号）才露出来。
  量缺口时如果发现「同一条症状修一处不动」，先搜「还有谁在问同一个问题」，
  再决定**哪一处才是判据的家**（这里住在共用层 `text-common-util.xl.md`，三处都只转发）。

**第 928 轮第二趟：把这一族的每个相邻位置各插一条注释 / 换行再普查——量出三格，一根收掉**

第 928 轮修完**再量一遍**（第 900 轮那套「每个相邻位置插 trivia」的缩小版，
`tmp/r928/gen2.mjs`：12 个构造 × 每个相邻位置 × `/*c*/` / 换行 = **780 条，534 条合法**），
剩 **3 格对不上**（`w-20-c` / `w-101-c` / `w-613-c`，前两条是「粘着写」与「加空格」两种排版）：

- `const k = ():/*c*/(() => void) => { return; };`
- `const k = (a: number):/*c*/((b: string) => void) => { return; };`
- `type X = A extends/*c*/(() => infer R) ? R : never;`

三格的症状一模一样：括号里那段**函数类型**被收成了**箭头函数**
（缺 `FunctionType` / `InferType` / `TypeParameter`，多 `ArrowFunction` + `EqualsGreaterThanToken`）。

- **根因**：`LamdaCloseRule.IsWrappedByTypeContext`（括号套括号时问「外层括号在不在类型位」）
  的那趟回扫只跳**软换行**——注释夹在 `:` 与 `(` 之间（或 `extends` 与 `(` 之间）时，
  回扫第一步就撞上它 ⇒ 落到末尾那句 `return false`（值位）⇒ `IsLambdaParameters` 答
  「这是形参表」⇒ 那段函数类型让给了箭头函数。**把注释换成换行一直是绿的**
  ——正是「注释与软换行在相邻判定里是同一件事」那条线（第 873 轮）的第 N 个落点。
- **修法**：回扫三步一律换 `SkipPreviousTrivia`（初始一步，以及 `=` 与普通标识符之后那两步）。
  守卫 `token/expressions/expr-arrow-return-parenthesized-comment.ts`。
- **账**：这一趟量到的 6 条片段（3 格 × 粘 / 空格两种排版）全绿；上一趟那 8 条与这一趟
  534 条合法片段**一条不红**；`npm run gates` 九道全过。

**第 928 轮第三趟：换一批构造（括号类型 / 构造类型 / 泛型函数类型 / async 箭头）再插一遍 trivia——量出四格，四根全收**

第三趟换掉那 12 个构造（`tmp/r928/gen3.mjs`：16 个构造 × 每个相邻位置 × `/*c*/` / 换行 =
**872 条，783 条合法**），量出 **4 格对不上**（各两种排版，共 8 条片段）：

| 写法 | 症状 | 根因与修法 |
| --- | --- | --- |
| `type T =/*c*/<T>(a: T) => T;` | 整段函数类型不成形（缺 `FunctionType` / `Parameter` / 三个 `Identifier`，多一个当类型引用的 `<T>`） | `IsLambdaParameters` 的**泛型支**往左那一跳只跳软换行 ⇒ 撞上注释 ⇒ `before` 取到注释 ⇒ 落到末尾「是形参表」；改 `SkipPreviousTrivia`（与 `IsTypeAliasAssignment` / `FunctionTypeCloseRule.Previous` 同口径） |
| `type T = <T>` ⏎ `(a: T) => T;` | 类型别名只剩 `<T>`，余下另起一条语句（缺 `FunctionType` / `TypeParameter`，多 `ExpressionStatement` + `ArrowFunction`） | `IsDeclarationHeadAwaitingParameters` 认不出「`type` + 名字 + `=` + `GenericType`」这个「等着形参表」的形状（原来只认「声明词 + 名字 + `GenericType`」）；补这一支（**只管类型别名**，`const f = <T>` 的值位那一档行为不变） |
| `const f = async ():` ⏎ `Promise<void> => {};` | 整条 async 箭头分家（缺 `ArrowFunction` / `AsyncKeyword` / `TypeReference`，多 `ExpressionStatement` + `BinaryExpression`） | `IsValueArrowReturnColon` 要求形参表左边那一格是 `=`，而这里夹着 `async`；跨过 `async` 之后两条判据照旧，「空形参表」那一格由 `async` 自己撑着（没有 `async` 时仍要求括号里有实义内容） |
| `const g = async /*c*/ x => x;` 与 `const f = async/*c*/(): Promise<void> => {};` | 整条箭头不见（缺 `ArrowFunction` / `AsyncKeyword` / `Parameter`…，多一个裸 `Identifier(async)`） | `LamdaCloseRule.Process` 找 `async` 的那一跳只跳软换行 ⇒ `IsAsync` 是假、`async` 留在外面当平级兄弟 `[Identifier(async), AreaAnnotation, Lamda]`；投影那一档（`print-ast-common` 的 0a'）原来只认三格 `[async, GenericType, Lamda]` ⇒ **两格 / 三格走同一段补法**（逗号分隔的 `[async, () => 1]` 是**三格**、`SymbolToken(,)` 挡着，所以两格不会误伤） |

- **守卫**（三条用例，收完登记进语料 —— 第 900 轮那条「一次收一族」的规矩）：
  `token/expressions/expr-async-arrow-adjacent-comment.ts`、
  `token/expressions/expr-async-arrow-return-newline.ts`、
  `token/types/type-alias-generic-fn-trivia.ts`。
- **账**：三趟探针（8 + 534 + 783 条合法片段）**一条不红**；`npm run gates` 九道全过
  （墙钟 **34.1s**）——`cases:tsast` 缺口清单仍是空的；coverage **4148 / 4317 → 4151 / 4320**
  （blocked 39、differ 130、bad 0）；`cases:check` **1551 → 1554** 条 0 不合格、
  `cases:tags` **5168 → 5198** 条断言 0 不一致、`cases:astjson` **36927 → 37042** 个节点六项全 0。
- **可复用的判据**：**换一批构造再插一遍 trivia，是同一套探针最便宜的第二次使用**——
  这一趟的四格没有一格是新构造，全是「同一个判据在另一种排版上少跳了一格 / 少认了一种形状」；
  四格里三格都在**往回走的那一步**上（`SkipPreviousWrapSymbol` → `SkipPreviousTrivia`），
  一格是**等着某一格的头**（`IsDeclarationHeadAwaitingParameters`）少了一族形状。
  量到「往回走」那一类时，先按「有循环 + 判相邻」把同一族的落点搜一遍，再动手。



**第 930 轮：标签冒号不算类型标注——「这个冒号是标签冒号吗」收成一份判据（缺口 4 → 3）**

第 929 轮登记的四个根里，「被标语句是**调用**时那两格换行」这一格先收：

| 写法 | 症状 | 根因与修法 |
| --- | --- | --- |
| `done: f` ⏎ `();` | 缺 `CallExpression`，漂 2 多 4（`f` 与 `()` 各成一条 `ExpressionStatement`） | 解析期续接表的 `(` 那一档先问 `HasTypeColonBefore`（「上一行是类型标注吗」），而它往回扫**先撞上的那个 `:` 是标签的冒号**（`done` 这个名字处在语句开头），却一律照类型标注答 ⇒ 判「上一行到此为止」⇒ 收壳。修法：那一支加问 `IsLabelColon`（`labelColonIsExpression` 这个开关与 `case` / `default` 共用，两族都不是类型标注） |

- **判据收成一份**：`IsLabelColon`（`text-common-util.xl.md`）原来在 `IsObjectLiteralBrace` 里
  **内联**写过一遍（标签冒号后面那个 `{` 是块，第 556 轮），两处问的是同一句话；
  收成一份之后 `IsObjectLiteralBrace` 那一支也只问它。
- **不误伤真类型标注**：`let a: f` ⏎ `()` 的名字 `a` 前面是 `let` ⇒ `IsStatementStart` 给否 ⇒
  照旧答「类型标注」；`declaration-common` 那两处调用点没传这个开关 ⇒ 行为一位没动。
- **账**：九道门全过（墙钟 33.5s）——`cases:tsast` 已知缺口 **4 → 3**（那一行 `xl:known-gap`
  按规矩撤掉、用例留着当守卫，`xl:expect` 按新形状重算成 `Label,Method`）；coverage
  **4153 / 4326 → 4154 / 4326**（blocked 43 → 42、differ 130、bad 0）；`cases:astjson`
  **1546 份 / 37117 → 1547 份 / 37140 个节点**六项全 0（那一份用例原来带 `xl:known-gap`
  ⇒ 被 astjson 那趟跳过，现在进语料了）。
- **可复用的判据**：**同一个谓词被两处内联，第二处迟早会漏掉一个条件**——这边抄的往往是
  「当时那一半」。量到「某某是不是某结构」这种问题时，先搜一遍它在几个地方各写了一份。

**第 930 轮（二）：被标语句的**头与体之间**换行——认声明头的那一支要先跳过标签头（缺口 3 → 2）**

同一族里剩下的那一格：`iface: interface I` 换行 `{ … }` / `en: enum E` 换行 `{ A }`
在 TS 那边都是**一条** `LabeledStatement`（被标的是那条声明）。

| 写法 | 症状 | 根因与修法 |
| --- | --- | --- |
| `iface: interface I` ⏎ `{ m(): void }`、`en: enum E` ⏎ `{ A }` | 缺 7 漂 2 多 11（声明本身 / 名字 / 成员全缺，多一个裸 `Block`） | 解析期「声明头里的换行不是语句边界」那一支（`StatementBranch.Condition`）是**从段首**看第一个词的，而段首是**标签名** `iface` ⇒ 词表问不到 `interface` / `enum` ⇒ 换行处收壳。修法：那一支先跳过标签头（`LabelCloseRule.SkipLabelHeads`，与 `Previous` 同源：名字在语句开头 / 跳过 trivia / 段头冒号不算 / 冒号后面能起一条语句） |

- **为什么另立一格而不是加宽 `IsHeaderBodyBrace` 的词表**：那张表问的是「末尾是不是一个
  **等着体的头**」，而这里的末尾是 `I` / `E`（名字那一格）——加词表要连名字、类型参数、
  继承子句一起算，那是类那一份 `ScanHead` 已经在做的事；而**真正的错处**是「段首被标签挡住」，
  跳过它之后原有的那一支一个字都不用改。**改在错的那一格上，别在邻居上打补丁。**
- **不误伤**：`SkipLabelHeads` 只在**段首**那一格起效（`IsStatementStart`），且要求冒号后面
  能起一条语句 —— `let x: T` / `a ? b : c` / `interface I { default: string }` 一律走不进去。
- **账**：九道门全过（墙钟 29.7s）——`cases:tsast` 已知缺口 **3 → 2**；coverage
  **4154 / 4326 → 4155 / 4326**（blocked 42 → 41）；`cases:astjson` **1547 份 / 37140 →
  1548 份 / 37184 个节点**六项全 0（那一份用例原来带 `xl:known-gap` ⇒ 被跳过）。

**第 930 轮（三）：注释落在语句壳的第一格——`SplitShell` 找头那一步要跳过前导 trivia（缺口 2 → 0，第六次清空）**

第 929 轮登记的五个根里最后两格，是**同一个根**（壳的头不是标签就不拆尾巴）：

| 写法 | 症状 | 根因与修法 |
| --- | --- | --- |
| `outer/*c*/: for (;;) { break outer; } g();`、`block/*c*/: { let x = 1; } h(x);` | 缺 7 多 2（`g();` / `h(x);` 被吞进标签那一格） | `LabelCloseRule.Process` 把名字与冒号之间那条注释搬到 `Label` **左边**（位置只能放左边），于是语句壳的**第一格**成了那条注释 ⇒ `SplitShell` 的「头是不是标签」当场为否 ⇒ 尾巴不拆。修法：找头那一格时跳过前导 trivia，且只为「头是空 `Label`」那一档放行 |
| `function h() { /*c*/ lbl: { break lbl; } return 1; }` | 缺 2 多 1（`return 1;` 被吞进去） | 同上一格：注释来自标签**前面**（函数体的开头）⇒ 壳的第一格是它。注释进树的口径不变（`caseBody` / 投影那两处照旧） |

- **可复用的判据**：**改一处时要问「这一处还有几种形状会走到」**（实测踩到的）：
  第一版只判「头是不是 `Label`」——于是「**已经包住语句的标签**」那一档（`block /* c */: { … }`）
  落进通用那一支：`tail = data.slice(1)` 从 **1** 起 ⇒ 标签既被搬进父亲、又留在新壳里
  （产物 `<Root><Label …/><Statement><Label …/></Statement></Root>`）、旁边那条注释一起消失。
  两处红：`cases:tags` 的 `decl-label-comment-after-name`（expect `AreaAnnotation`，产物 0 个）
  与 `coverage` 的 exec `049-declarations-decl-label-block-comment`（stdout 不同）。
  **新加的「放行」条件要与它要进的那一支一字不差**，否则不是放行、是绕开。
- **账**：九道门全过（墙钟 29.9s）——`cases:tsast` 已知缺口 **2 → 0**（两行 `xl:known-gap`
  按规矩撤掉、用例留着当守卫）；coverage **4155 / 4326 → 4157 / 4326**（blocked 41 → 39、
  differ 130、bad 0、**regressions 0**）；`cases:astjson` **1548 份 / 37184 → 1550 份 /
  37262 个节点**六项全 0。

## 被否决的改法（不要再试）

0. **把 `typeof !0` 那一格归到「token 层重组深度那道硬界」上**（第 762 轮登记的诊断，
   **第 961 轮推翻**）：当时的结论是「`typeof` 没升成 `Keyword` 是因为 `Depth >= 8`
   加上 `KeywordCloseRule` 排在最后，与第 550 轮 `in` / `instanceof` 同一个根，
   改它要连带重跑 1414 份 token 语料」。**实测不是**：`typeof` 那一格在
   `NotNullCloseRule` 跑的时候本来就是 `Identifier`（那时 `KeywordCloseRule` 还没跑），
   而**同一个词的「能不能当操作数」这条纪律早就写好了**——
   `tokens/unary-operator.xl.md` 的 `IsOperand`（第 167 轮）与 `binary-operator.xl.md`
   那一份**都排掉了** `typeof` / `void` / `delete`，只有**非空断言那条同源判据**
   （`text-common-util.xl.md` 的 `IsAssertableOperand`）漏抄了这三个词。
   于是同一个词在两条判据上给出**相反**的答案，而先跑的 `NotNullCloseRule` 说了算。
   **改一句话就转绿**（`coverage 4204 → 4205`、`blocked 27 → 26`），**一份语料都不用重跑**。
   **教训**：「同一个问题只有一份实现」要连**那一份的每一处副本**一起核——
   症状不是「那处坏」而是「两处矛盾」。下一处这类落点先去找同源判据的其它副本，
   别先怀疑重组深度。

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
5. **把「括号里的第一个 `{`」那一支从 `(` 放宽到 `(`/`[`**（第 849 轮试过、整份撤回）：
   `type T = [{ a: 1 }]` 是元组类型、`let x = [{ a: 1 }]` 是数组字面量，分开它们确实是
   「外层那一格」，可放宽之后**值位的数组字面量成片被收成 `TypeLiteral`**——
   实测 `coverage` 3989 → 3970、blocked 58 → 77，六条 e2e 报
   `unimplemented: expression TypeLiteral`。元组元素那一格登记成缺口
   （`gap-type-tuple-element-literal`），要等「括号自己的 `Context`」那条线启用
   （`type-literal.xl.md` 开头那一节写着那条线为什么还不能启用）。
   **第 851 轮又试了一次、以同样方式失败，但把根因钉下来了**：这一轮加的那道闸是
   `IsTypeBracketPosition`（方括号专属的位置判据），想的是「值位数组会被它挡住」。
   它确实挡住了 `f([{…}])` / `[{…}]` / `[函数体]` / 三元两支，
   **可是挡不住带类型标注的声明**：`const tree: Tree = { v: 1, kids: [{ v: 2, kids: [] }] };`
   里 `kids: [...]` 的那个 `[` 左边是**名字**（`kids`），`IsTypeBracketPosition` 于是
   顺着「宿主是 `ObjectLiteral` 时算类型位」那一支答**真** ⇒ 数组里的对象成了 `TypeLiteral`。
   实测 `coverage` 3994 → 3984、blocked 54 → 64（正是第 849 轮那六条 e2e 加四条 runtime）。
   **下一步要动的不是这一支，而是 `IsTypeBracketPosition` 里「宿主是 `ObjectLiteral` ⇒ 类型位」
   那一条**：对象字面量的**值**位上不可能有类型，`{ kids: [ … ] }` 的 `[` 是数组字面量。
   判据得看「那个名字前面是不是 `:`（键分隔符）」——`{ kids: […] }` 是键，
   `{ [K in T]: … }` 那种映射类型才轮得到类型位。
   **在那一句修好之前，这一支不要动**（两次都整份撤回，别试第三次）。
   **第 868 轮把这个缺口收掉了**，但走的是**另一条路**：那两版都是改
   `IsTypeBracketPosition` / 那一支「括号里的第一个 `{`」，而 868 把答案交给
   `Bracket.Context`，并把三个会给错 `Context` 的入口逐个堵上（见下面第 868 轮那一段）。
   这一条**作为「被否决的改法」仍然成立**：上面那两版（放宽 `(`/`[` 那一支、加
   `IsTypeBracketPosition` 那道闸）**不要再试**。
6. **元组元素位那一格（第 865 轮试过、整份撤回；第 868 轮从另一条路收掉）**：
   目标是把 `gap-type-tuple-element-literal` 收掉——`type T = [{ a: 1 }]` 里那个 `{` 该是类型字面量。
   第 865 轮改的是**两半**：

   - **`DecideBracketContext` 的冒号那一支**：跨过 `=` 之后撞上的冒号不是本括号的标注
     ⇒ 判值位（`const tree: Tree = { … }` 往回扫先撞上 `=`、再跨过 `Tree`、最后才撞上
     类型标注那个冒号）。**这一半实测是对的**：插桩看，那个对象字面量连它里面每一层括号的
     `Context` 都从 `"type"` 变成 `"value"`。
   - **`IsTypePosition` 里「括号里的第一个 `{`」那一支放宽到 `[`**，而 `[` 那一档**读它自己的
     `Context`**（第 849 / 855 两轮记下的「另一条路不成立」正是因为上面那一半还没修）。
     这一半也当场成立：`type T = [{ a: 1 }]` 转绿、`const a = [{ b: 1 }]` / `f([{ a: 1 }])` /
     `const tree: Tree = { …, kids: [{ … }] }` 三档逐格不动，`cases:tsast` 缺 0 漂 0 多 0。

   **代价**：`coverage` **4010 → 4007**、blocked **43 → 47**——掉下去的四条**全是解构**：

       runtime/round762/001-destructuring-and-spread   unimplemented: expression TypeLiteral
       runtime/values/202-nested-destructuring-defaults  ast node BindingElement has no child name
       e2e/scenarios/067-destructuring-and-spread        ast node BindingElement has no child name
       exec/round711/001-call-chain-then-member          unimplemented: expression TypeLiteral

   **两半分不开**：只留冒号那一半（把元组那一支用 `&& false` 关掉）**照样掉**——
   而元组那一支又**必须**有冒号那一半（`kids: [...]` 那个 `[` 的 `"value"` 是从外层 `{`
   的 `Context` 传下来的）⇒ 要么一起要、要么一起不要，所以整份撤回。

   **没查完的那一格**（下一轮的第一站）：四条掉的都是**解构**，症状是某个 `{ … }`
   （绑定模式的括号）翻成了值 / 类型。逐对量「改前 / 改后」的括号 `Context` 序列是本轮
   试过的手法，但**第一版比对脚本把补丁打到了两份拷贝上**（比的是同一份、因此「零差异」），
   要重做：一份**去掉**冒号那一支、一份留着，逐条对齐找出**第一个翻面的括号**。

   **在那一格量清楚之前，这一支不要再整份试第三次**——第 868 轮量清了，结论是：
   **第 865 轮那两半都不是必须的**。重做那次比对之后实测：
   **冒号那一半单独打在四个「掉下去」的文件上，XML 一个字节都不变**；
   真正翻面的是**另外三个入口**（`typeof` 后面的 `[`、绑定模式里的 `[`、映射类型的键括号），
   它们都在 `DecideBracketContext` / `IsTypePosition` 的**别处**。第 868 轮从那条路收掉了
   （这一段上面的第 5 条与「第 868 轮收掉的 1 条」都记着）。

**第 957 轮：谓词那条 `(` 被调用那一趟抢走——判据转发给谓词规则（缺口那一条从 18 缺收到 8 缺，仍是缺口）**

第 956 轮登记的那一条（[`gap-r956-predicate-paren-type`](../../tests/cases/token/types/gap-r956-predicate-paren-type.ts)）这一轮量到了根上，
**那一族 23 条片段全绿**（`x is (string)` / `asserts x is (A)` / `this is (A)` / 类方法 / 接口 / 类型字面量 / 箭头 / 泛型约束 /
嵌套括号 / 元组 / 函数类型 / `keyof` / 字面量 / 前后夹注释与软换行）。

- **根因是「谁先看见那一格」**：谓词那两条规则的闸门是 `IsTypeContainerUnit(父亲)`，
  而谓词的类型套一层圆括号时，**括号关闭那一刻**这一格的父亲还是 `ReturnType` 之外的那个容器
  （判据那一趟来晚了）；可 `MethodCloseRule` **恰恰在那一刻**看到平级的 `[名字, is, (…)]`，
  于是把 `(` 当成**实参表**收成一次调用 ⇒ 整条谓词塌成 `<Method name="is">`。
- **闸门下在它前面**：`type-predicate.xl.md` 的 `TypePredicateCloseRule` 在构造时把
  `MethodCloseRule.PredicateShape` 装上（那是**静态**字段，构造期就在 `parse-pipeline` 的
  `GeneralCloseRule` 求值里跑到），`MethodCloseRule.Previous` 认下就**让路**。
- **判据只有一份**（第 875 轮那条规矩）：`IsPredicateAt` 是唯一实现，两处都只是转发；
  本规则那一侧只把**括号自己的下标**递过去，往回数名字那一跳写在谓词那一侧。
- **第一次量错的一格**（记下来）：把 `MethodCloseRule.NameIndex` 给的 `nameIndex` 递过去时，
  它落在 **`is`** 上（`SkipPreviousTrivia` 只跨 trivia，跨不过那个词），`IsPredicateAt` 第一句
  就把「名字是 `is`」挡掉 ⇒ 判据永远答假、修了个空。**判据的参数是「名字在哪」，不是「谁离我最近」。**

- **仍开着的那一格**：类型那一格还停在一对**裸 `Bracket`** 上（缺 `ParenthesizedType` / `StringKeyword`，
  多 4，记在这条 `xl:known-gap` 里）。`ParenthesizedTypeCloseRule` 的闸门同样是「父亲是类型容器」，
  而那一刻父亲还不是它；换父之后**没有第二趟**会回来收这个括号（谓词成形时括号已经是它自己的子单元，
  那条规则看到的是 `ParenthesizedType` 位置上的 `Bracket` 而不是 `Bracket` 位置上的 `Bracket`）。
  **入手处**：让谓词成形之后**重跑一次括号自己的那一趟**（与 `ParenthesizedTypeCloseRule.Process`
  换父之后重跑是同一件事）。
- **实测**：九道门全绿（墙钟 34.4s）——`cases:tsast` 16/16 片、已知缺口仍是 2 条；
  `coverage` 4199 / 4366（blocked 29、differ 138、bad 0）**一个字没动**（这一族不在语料里）；
  `cases:check` 1600 条 0 不合格、`cases:tags` 5326 条断言 0 不一致、`cases:astjson` 六项全 0。
