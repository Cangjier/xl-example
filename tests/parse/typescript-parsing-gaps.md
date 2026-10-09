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

## 收缺口的两条规矩

- **一次收一族**：把量出来的那一族整个收掉；量出来的时候**先补用例**（带 `xl:known-gap` 进语料），
  收掉的时候删掉那行指令——只修现场那一条，下一轮换个排版又回来。
- **先探「同族的第三条」**：`do` 的体自带分号那一族、循环头部括号里出现 `)`、
  括号 / 一次调用当被调用者时的可选链、「注释 / 换行落在语法相邻位置之间」，
  都是这么一条一条量出来的——**最后那一族是今天最大的一族**（见下）。

## 已知仍开着的缺口（**0 条**）

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
