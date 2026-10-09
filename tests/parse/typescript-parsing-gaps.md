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
- **解析期那一问只看得见左边**（第 835 轮）：`Statement.LineCannotEnd` 与
  `LabelCloseRule.IsPendingLabelHead` 都是**解析期**的判据，那一刻 `Data` 里只有
  **已经读到的**单元 —— 同一行后面的东西还没进来（`SkipNextTrivia(data, i)` 会落到
  `data.length` 上、`Get` 给 `null`）。**别把收尾期那一问原样搬过来**（探针实测：
  第一版 `IsPendingLabelHead` 里复用了收尾期的 `StatementStartsHere`，恒为假）。
  与第 820 / 822 / 828 轮那条「头还没写完 ⇒ 换行不是边界」是同一族
  （`IsPendingImportHead` / `IsPendingDecoratorHead` / 本轮的 `IsPendingLabelHead`）：
  判据**只用左边**，右边那一格如果是续接符，`Condition` 里后面那两条本来就不收壳。
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
- **语言配置带来的差异不是缺陷**：`\a` 解成响铃字符而不是字母 `a`；
  `@'…'` / `@"…"` 是逐字字符串前缀、不是装饰器。

## 收缺口的两条规矩

- **一次收一族**：把量出来的那一族整个收掉；量出来的时候**先补用例**（带 `xl:known-gap` 进语料），
  收掉的时候删掉那行指令——只修现场那一条，下一轮换个排版又回来。
- **先探「同族的第三条」**：`do` 的体自带分号那一族、循环头部括号里出现 `)`、
  括号 / 一次调用当被调用者时的可选链、「注释 / 换行落在语法相邻位置之间」，
  都是这么一条一条量出来的——**最后那一族是今天最大的一族**（见下）。

## 已知仍开着的缺口（**89 条**）

**缺口清单长在语料里**：每条缺口就是 `tests/cases/token/<功能域>/` 下的一个用例文件，
文件头带一行 `// xl:known-gap <根因>`。`cases:tsast` 每趟把它们逐条真跑一遍：

- **还对不上** ⇒ 记 `KNOWN`，差额**不算进那八项**（所以 `npm run gates` 可以是绿的）；
- **已经对上了** ⇒ 报「收掉了」并**红**，逼你回来删掉那行指令——清单不许只增不减。

这一趟的结论就是门的那一行输出（`已知缺口：N 条还开着、M 条已经收掉`），
所以「还差多少」在 `npm run gates` 里直接看得见，不必回 `tmp/` 翻探针。
同一条纪律也适用于 `coverage` 那一侧（`xl:want blocked` / `differ` 的 62 条）。

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

**第三段（18 条）逐条**（它们不属于上面两族，各有各的根）：

| 用例 | 形状 | 症状 |
| --- | --- | --- |
| [destr-object-newline-after-keyword.ts](../cases/token/declarations/destr-object-newline-after-keyword.ts) | `const \n{ a, b: c, d = 1, ...rest } = o` | 换行落在声明关键字与解构模式之间时整条声明解体（缺 11 / 多 15）：`Let` 那一趟与 `{` 都是按「紧邻」找模式的 |
| [decl-declare-function-trailing-comment.ts](../cases/token/declarations/decl-declare-function-trailing-comment.ts) | `declare function f(): void /* c */ ;` | 无体声明的区间只到自己最后一个实义单元，尾随注释与 `;` 没算进去（TS 的 `FunctionDeclaration` 到 `;` 为止） |
| [expr-function-expression-plus.ts](../cases/token/expressions/expr-function-expression-plus.ts) | `const r20 = function f() {} + 1` | 函数表达式后面还能接运算符，这里整段收成了别的形状（缺 4） |
| [expr-generic-instantiation.ts](../cases/token/expressions/expr-generic-instantiation.ts)、`expr-generic-inst-let`、`expr-generic-inst-statement`、`gap-d-generics-tuple-mapped-01` | `const a = f<string>;` | **泛型实例化表达式**（TS 4.7）没有规则：产物是 `BinaryExpression(f < string)`，TS 是 `ExpressionWithTypeArguments` |
| `expr-async-generic-arrow`、`-spaced`、`gap-d-generics-tuple-mapped-02` | `async <T>(x: T) => x` | `async` 与泛型段**谁先认领**没有定义（各缺 7–13） |
| [mod-declare-module-shorthand.ts](../cases/token/modules/mod-declare-module-shorthand.ts) | `declare module "mm";` | 简写形态不成形（缺 2 多 1）；**带 `{}` 的那一条是好的** |
| [stmt-do-while-then-statement.ts](../cases/token/statements/stmt-do-while-then-statement.ts) | `do {} while (a) b()` | `do…while` 后面还跟着一条语句时那一格没被收（缺 3） |
| [stmt-switch-comment-fallthrough.ts](../cases/token/statements/stmt-switch-comment-fallthrough.ts) | `switch /* c */ (a) { case 1: case 2: … }` | 判别括号认不出 ⇒ `case 1:` 那一格整条落空（缺 5 漂 1 多 3） |
| [stmt-switch-block-then-default.ts](../cases/token/statements/stmt-switch-block-then-default.ts) | `switch (1) { case 1: { break; } default: break; }` | 单行写完一个块再跟 `default`：语句层把 `default:` 并进了同一个壳，分段只在顶层单元上找 `case` / `default` ⇒ 只有一段。**换行写法是好的**（见根 README 的「开着的缺口」，块当语句边界的改法已被否决） |
| [stmt-label-comment-before-call.ts](../cases/token/statements/stmt-label-comment-before-call.ts) | `a: b: c: d/* c */ ()` | 标签那一趟看到的是注释，最后一层标签没接上被标的语句（缺 1） |
| [stmt-generator-trailing-semicolon.ts](../cases/token/statements/stmt-generator-trailing-semicolon.ts) | `function* g() { yield* h(); };` | 尾随那个 `;`（空语句）没成壳（缺 1 漂 1 多 1） |
| [type-param-conditional-constraint.ts](../cases/token/types/type-param-conditional-constraint.ts) | `x extends A extends B ? C : D` | 约束位上的嵌套条件类型不成形（缺 10 / 字段 1） |
| `type-asserts-toplevel`、`type-param-asserts-constraint` | `type T = asserts x is A` / `<X extends asserts x is A>` | 断言谓词只在返回类型那一位成形（各缺 5 多 2）：`TypePredicateCloseRule.Previous` 的「起点」只认容器第一个实义单元与紧跟 `=>`，而 `=` / `extends` 右边同样是合法类型位 |
| [type-param-template-literal-constraint.ts](../cases/token/types/type-param-template-literal-constraint.ts) | `` x extends `a${A}b` `` | 约束位上的模板字面量类型不成形（缺 15 多 7，还带一处未映射 `Bracket`） |
| [type-typeof-qualified-index.ts](../cases/token/types/type-typeof-qualified-index.ts) | `type A = typeof a.b[K]` | 点号名在产物里是平级单元，`TypeQuery` 于是吞下整个 `a.b[K]`（缺 4 漂 2 多 1）。**不带点号的** `typeof a[K]` / `typeof a[]` / `typeof a[K][L]` 已经收掉 |
| `mut-stmt-asi-return-newline-expr-115` | `function f(/* c */)` | 那条注释让 ASI 那一族的形态漂一格（多 1 字段 1） |

上表把第三段列全（`expr-generic-*` / `expr-async-*` / `type-asserts-*` 三行各含 2–4 条同族）；
第一、二段那些条不用在这里再抄一遍——逐条的根因都写在各自文件头的 `xl:known-gap` 后面。

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
