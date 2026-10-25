# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { OperatorTable } from "../expressions/operator-table.xl.md"
import { ShapeInsertUtil } from "../shape-insert-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { InterpolationString } from "../../../core/syntax/basic-tokens/string/interpolation-string.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { RegexToken } from "../../../core/syntax/basic-tokens/regex-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class StatementOperandShape extends ShapeToken

**表达式体候选里的一个节点**（Stage 3 S3a/S3b，设计 §4.2）：操作数叶子、运算符节点、前缀节点、括号节点共用同一类，
用 `Kind` 分型、用 `Text` 记住本节点的字面文本。

**它不搬运 raw 单元**：`StatementShape.Data` 里那批 basic token 仍是 `StatementBuilder` 的输入（AST 由它逐字节建成），
所以叶子只在壳里记「文本 + 分型」，不把 raw token 移进自己（移进去会改 `Parent` 指针、让建造器读不到单元）。
这正是 S3a/S3b 只接管**形状层**、AST 仍由建造器产出的原因（见 `HANDOFF-s3-ops.md` 的未覆盖清单）。

```txt
1*2+3   ->  +(*(1,2),3)
a+b*c   ->  +(a,*(b,c))
a-b-c   ->  -(-(a,b),c)
```

## field Kind:int = 0

节点分型（取值见本类静态常量）。

## field Text:string = ""

叶子/运算符的字面文本：标识符与数字就是它的正文，运算符就是 `+` `-` `*` `/` `%`。

## field Raw:Token | null = null

**S3c：本节点对应的那个 raw 基本单元**（标识符/数字叶子 → 那个 `Common`；二元/前缀节点 → 那个运算符
`Symbol`；括号节点 → 那个 `Bracket`）。它**只是一个引用**：单元仍留在壳 `Data` 里由 legacy 建造器使用，
本节点不移动、不改 `Parent`、不参与 XML。

为什么必须持它：S3c 的收口器（`StatementShapeAst`）用它与 `ExpressionBuilder.Units` 对齐，从而把
`Pos` / `SignIn` / `SignOut` 落在与 legacy **同一个单元**上——节点类型与范围因此逐字段一致。

## field Args:Token | null = null

`KindNew` 的实参括号（`new X(a)` 的那个 `(`），或 `KindOptionalCall` / `KindOptionalIndex` 的括号。
它不是子节点（括号里的内容不进形状树），AST 侧仍由 legacy 的 `ParseBracketArguments` / 内层嵌套体整段建。

## field Colon:Token | null = null

`KindConditional` 的冒号单元（S3h）：`?` 记在 `Raw` 里、`:` 记在这里。两者都要作为子节点投影进 AST
（`ConditionalExpressionShape` 的 children 是「条件, ?, 真, :, 假」五格，由 `MakeOperatorToken` 建
`QuestionTokenShape` / `ColonTokenShape`），而形状树只表达**结构**（`Data = [条件, 真, 假]`），
所以两个标点各占一个字段。

## field TailEnd:Token | null = null

`KindTypeAssert` 的**类型区域末单元**（Stage 5d-8b）：`as` 之后被吞掉的最后一格。
类型区域不进 `Data`（形状树不解析类型），收口器于是不能从子节点推出「本节点声明到哪结束」——
这一格把它显式记下来：`ParseFollowingType` 必须恰好消费到 `TailEnd` 为止，形状树与 AST 的长度
才谈得上一致（`a as T` / `a as T + b` / `a ? b as T : c` 三种长度的判据是同一个）。

## field Open:bool = false

`KindNew` 的被构造者后缀链是否还开着：被构造者挂上后置 `true`，`(` 被 `AcceptNewArgs` 收走时置 `false`。
`true` 时 `InsertionPoint` 会穿过它（`.b` / `[k]` 属于被构造者的链）；`false` 时 `.y` / `()` 属于构造结果。
## static field KindHolder:int = 0

根持有者（`StatementOperatorBody.Root`）：不是表达式节点，只用来挂最外层 shape，所以它永远不要被渲染。

## static field KindIdentifier:int = 1

标识符叶子。

## static field KindNumber:int = 2

数字字面量叶子（判定见 `StatementOperatorBody.LooksNumber`：与 `NumericLiteralShape` / `BigIntLiteralShape`
的接受集同一口径，含前导点写法 `.5`）。

## static field KindOperator:int = 3

二元运算符节点：`Data = [左操作数, 右操作数]`、`Text = 运算符`。**运算符不是子单元**（见文件头：不造第二份运算符映射）。

## static field KindPrefix:int = 4

前缀一元节点：`Data = [操作数]`、`Text = 运算符`。

## static field KindParen:int = 5

圆括号节点：`Data = [括号内表达式]`。括号的意义就是「把一段中缀运算整体当成一个操作数」，
所以它渲染成 `(b+c)`，不是 `(+(b,c))`——见 `RenderInfix`。

## static field KindKeyword:int = 6

关键字字面量叶子（S3d）：`true` / `false` / `null` / `this`。它们是 `Common`，`Text` 就是关键字本身；
AST 侧由 `StatementShapeAst` 走 legacy 的 `TrueKeywordShape` / `FalseKeywordShape` / `NullKeywordShape` /
`ThisKeywordShape` 工厂（与 `ExpressionBuilder.ParsePrimary` 同一批），所以 XML 逐字段一致。

## static field KindString:int = 7

普通字符串字面量叶子（S3f）：`Raw` 是那个 `String` 单元，AST 侧走 `StringLiteralShape.FromBasicToken`
（与 `ExpressionBuilder.ParsePrimary` 的 `String` 分支同一工厂）。内插模板**不是**本类：见 `KindTemplate`。

## static field KindTemplate:int = 8

**无内插**模板字面量叶子（S3f）：`` `abc` ``。`Raw` 仍是 `String` 单元，AST 侧走
`NoSubstitutionTemplateLiteralShape.FromBasicToken`（= `ParseTemplateToken` 在 `interps.length === 0` 时的分支）。
带内插的模板 `String.Data` 里有 `InterpolationString`，本片不接（`Decline` → legacy）。

## static field KindRegex:int = 9

正则字面量叶子（S3f）：`Raw` 是 `RegexToken`，AST 侧走 `RegularExpressionLiteralShape.FromBasicToken`
（= `ParsePrimary` 的 `RegexToken` 分支）。

## static field KindMember:int = 10

成员访问节点（S3f）：`Data = [对象, 成员名]`，`Raw` 是那个 `.` 符号单元。

**为什么成员名是子单元、而 `.` 不是**：legacy 的 `PropertyAccessExpressionShape` 只 `Add(expression)`、`Add(name)`，
点号本身不投影进 AST（`a.b` 的 children 是 `a` 和 `b`）。所以形状树也照这个形状记：两个子节点、点号只在 `Raw` 里。

## static field KindCall:int = 11

调用节点（S3f）：`Data = [被调用者]`，`Raw` 是那个实参括号 `Bracket`。
**实参不进形状树**：实参在括号单元自己的 `Data` 里，AST 侧用 legacy 的 `ParseBracketArguments` 整段建
（与 `ParsePostfixSuffix` 的调用分支同一段代码），所以形状树只负责证明「调用接在谁身上」。

## static field KindIndex:int = 12

索引访问节点（S3f）：`Data = [对象, 下标表达式]`，`Raw` 是那个方括号 `Bracket`。
下标走**嵌套体**（与圆括号同一套：`bracket.Data` 整段喂一遍），所以下标里的表达式同样由形状树逐节点建。

## static field KindArray:int = 13

数组字面量（S3f）：`Data = []`、`Raw` 是那个 `[` 括号单元。元素不进形状树，AST 侧走 legacy 的
`ParseArrayLiteral`（元素 / 空槽 / 展开全由它建），形状树只证明「这是一个数组字面量操作数」。

## static field KindObject:int = 14

对象字面量（S3g）：`Data = []`、`Raw` 是那个 `{` 括号单元。元素不进形状树，AST 侧走 legacy 的
`ParseObjectLiteral`（成员 / 简写 / 展开 / 访问器全由它建）。**只在 `Nested` 本体里接受**：括号 / 索引内部
才是明确的表达式位置；语句首的 `{` 必须留给块壳（`BlockPossibleShape`）与 legacy，形状层不去抢。

## static field KindNew:int = 15

`new` 表达式的**前缀节点**（S3g）：`Data = [被构造者（含其后缀链）]`、`Raw` 是 `new` 关键字单元、`Args` 是可选
的实参括号。它走 `Prefixes` 前缀栈（`-new X()` 的包裹顺序因此自然正确），AST 侧交给 legacy 的 `ParseNew`
整段建（`NewExpressionShape` 的 children 与 `Pos` 由同一段代码决定，不重写）。

`Open` 区分两种 `.` / `[`：`new a.b()` 的 `.b` 属于**被构造者**的链（`Open == true` 时插入点穿过本节点），
`new X().y` 的 `.y` 属于**构造结果**（`AcceptNewArgs` 收走括号后 `Open == false`）。

## static field KindQuestionDot:int = 16

`?.` 的**待定节点**（S3g）：读到 `?.` 时先建出来插好位置（`Data = [对象]`），转 `ExpectOptional`；
下一个单元到达后原地升级成 `KindOptionalMember` / `KindOptionalCall` / `KindOptionalIndex`。
它只在表达式未收口时短暂存在（`IsComplete()` 要求 `Expect == ExpectOperator`），不会进结构文本。

## static field KindOptionalMember:int = 17

可选成员访问（S3g）：`Data = [对象, 成员名]`、`Raw` 是 `?.` 单元。AST 是 `PropertyAccessExpressionShape`，
children 比普通成员多一个 `QuestionDotTokenShape`（`ExpressionBuilder.ParsePostfixSuffix` 的 `?.` 分支同口径）。

## static field KindOptionalCall:int = 18

可选调用（S3g）：`Data = [被调用者]`、`Raw` 是 `?.` 单元、`Args` 是实参括号。实参仍不进形状树。

## static field KindOptionalIndex:int = 19

可选索引（S3g）：`Data = [对象, 下标表达式]`、`Raw` 是 `?.` 单元、`Args` 是方括号。下标走嵌套体。

## static field KindConditional:int = 20

条件表达式（S3h）：`Data = [条件, 真分支, 假分支]`、`Raw` 是 `?`、`Colon` 是 `:`。
它走一个**优先级 1 的普通帧**（低于一切二元运算符、高于赋值），所以：

- `a + b ? c : d` 到达 `?` 时先弹掉完整的 `+` 帧 → 条件是 `+(a,b)` 整条；
- `x = a ? b : c` 到达 `?` 时赋值帧（优先级 0）留在栈上 → 条件只是 `a`，条件是 `=(x, ?(a,b,c))` 的左支。

`?` 与 `:` 之间、`:` 之后都回到 `ExpectOperand`，所以真 / 假分支各自可以再是赋值或条件（`?` 右结合、
真分支里也能嵌套）。AST 用 `ConditionalExpressionShape`。

## static field KindNonNull:int = 22

后缀非空断言 `!` 的形状节点（S3i）：`Raw` 是那个 `!` 单元，`Data` 是唯一的操作数。
## static field KindImportKeyword:int = 23

表达式位 `import` 的关键字叶子（S3k-3）：`Data = []`、`Raw` 是 `import` 单元、`Text = "import"`。
`import.meta` 由随后的普通成员后缀接上 `meta`，AST 侧在 `StatementShapeAst` 里改写回 legacy 的
`MetaPropertyShape`；动态 `import("m")` 由随后的普通调用后缀接上实参括号，AST 侧就是
`ImportKeywordShape` + `CallExpressionShape`（与 `ExpressionBuilder.ParsePrimary` 的 import 分支同一棵树）。

只吃 `import` 一格是**刻意的**：壳可能在任何一格建起来（`import .` 那一格 / `import (` 那一格），
向前看会因为后面的单元还没到而失败；逐格接后缀则不管壳何时建都能接上。

## static field KindPostfix:int = 21

后缀自增自减（S3h）：`Data = [操作数]`、`Raw` 是 `++` / `--` 单元、`Text` 是同一个文本。
**运算符不投影成子节点**（legacy `ParsePostfixSuffix` 只 `Add(expression)`，运算符只进区间），
所以形状树也只记一个操作数；AST 用 `PostfixUnaryExpressionShape`，`Pos` 取
`SpanNode(操作数首单元, 运算符单元)`——与 `ParsePostfixSuffix` 的 `SpanNode(start, At - 1)` 同口径。

## static field KindArrow:int = 24

箭头函数（S3l）：`Data = [参数]`、`Raw` 是 `=>` 单元、`Text = "=>"`。
参数要么是一个 `KindIdentifier`（`x => …`），要么是一个 `KindParen`（`(…) => …`，含空参数 `()` 与
**未解析参数表**——`(a, b)` / `({x})` 这类形状层不解释的括号，`Data` 为空、渲染成 `params`）。
体**不进形状树**：箭头体是赋值表达式或块，AST 侧由 legacy `ParseAssign` 从参数单元起整段建
（`ArrowFunctionShape` / `ParameterShape` / `EqualsGreaterThanToken` 全由那段代码决定）。

## static field KindFunction:int = 25

函数表达式的不透明操作数（S3l）：`Data = []`、`Raw` 是 `function` 关键字单元、`Text = "function"`。
头部（名字 / 类型参数 / 实参括号 / 返回类型）与函数体 `{…}` 都**不建节点**，由 `ExpectBody` 吞掉；
AST 侧 `ParseFunctionExpression` 从关键字起整段建。只在**操作数位置**接受（语句首 `function` 是声明，走路由层）。

## static field KindClass:int = 26

类表达式的不透明操作数（S3l）：`Data = []`、`Raw` 是 `class` 关键字单元、`Text = "class"`。
与 `KindFunction` 同构；`<` / `>` / `{` 在 `ExpectBody` 里被跳过，所以 S3g 记录的
「`class < T > {object}`」错树路径不再成立（它们不再作为二元运算符 / 对象字面量进入形状树）。
AST 侧 `ParseClassExpression` 从关键字起整段建。

## static field KindTaggedTemplate:int = 27

标签模板（Stage 5d-7）：`Data = [标签（被标宿主）]`、`Raw` 是那个模板 `String` 单元。
**模板本身不进形状树**（它是 `String`，内容在内插段里），AST 侧由 legacy `ParseTemplateToken` 建——
与 `KindTemplate`（普通模板操作数）同一工厂，与 `ExpressionBuilder.ParsePostfixSuffix` 的模板分支同一个调用。
宿主可以是**任何**已建好的表达式：``tag`t` `` / ``a!`t` `` / ``[a,b]`t` `` / ``new C()`t` `` / ``a?.b()`t` ``
——因为本节点走 `InsertionPoint` 把「当前表达式」原地变成它的第一个子节点，与成员 / 调用 / 非空断言同一条插入路径。

## static field KindTypeAssert:int = 28

类型断言（Stage 5d-7）：`Data = [被断言表达式]`、`Raw` 是那个 `as` / `satisfies` 单元、`Text` 是同一个文本。
**类型不进形状树**（形状层没有类型节点）：`BuildNode` 把左边那棵子树建好之后，从 `as` 之后整段交给 legacy
`ExpressionBuilder.ParseFollowingType`，外层节点用 `AsExpressionShape` / `SatisfiesExpressionShape`——
与 `ExpressionBuilder.ParseBinary` 的 `IsTypeOperator` 分支同一批工厂、同一段区间口径。

## static field KindNewTarget:int = 29

`new.target`（Stage 5d-7）：`Data = [名字（`target`）]`、`Raw` 是 `new` 单元、`Args` 是那个 `.` 单元。
AST 侧（`StatementShapeAst`）把整格交给 legacy `ExpressionBuilder.ParseNew()`——它对 `new . target`
本来就有专门分支（`MetaPropertyShape` + 只投影名字），所以节点与 legacy 逐字段同源。

## static field KindTypeArguments:int = 30

类型实参尾巴（Stage 5d-7）：`Data = [左表达式]`、`Raw` 是那个 `<` 单元。
`<` 是小于号还是类型实参表，只有看到整条语句的全部单元才判得了（`AngleJudge.CanStart`），
所以本体在 `IngestAll` 收尾处判成「类型实参」时**重放前缀**（`ResetState` + 逐格 `Ingest` 到 `<` 之前），
把前缀表达式包成这一格、停在 `Closed`。AST 侧把 `<` 之后整段交给 legacy
`ExpressionBuilder.ParsePostfixSuffix`（类型实参调用 / 实例化表达式 / `?.<T>(…)` 的唯一实现），
并要求它恰好吃到最后一个单元——判否就整条回 legacy，绝不建半截树。

## static field KindPrivateName:int = 31

私有名（Stage 5d-7）：`Data = [名字]`、`Raw` 是那个 `#` 符号单元。
token 层把 `#x` 拆成 `Symbol "#"` + `Common "x"` 两格，AST 侧由 `PrivateIdentifierShape` 合成
（`SignInToken(#)` + `SignOutToken(x)` + `Pos = Positions[#]`，与 `ExpressionBuilder.ParsePostfixSuffix`
的私有成员分支、`ParsePrimary` 的私有名字分支逐字段同口径）。
成员位（`this.#x` / `obj.#x`）与操作数位（`#x in obj`）共用这一格。

## static field KindAwait:int = 32

`await` 操作数（Stage 5d-8b）：`Data = [操作数]`、`Raw`/`Text` 是那个 `await` 单元；没有操作数的形态
（`await` 后面直接是 `;` / `,` / `)` / `]` / `}`）`Data` 为空。

**为什么形状层不判「这是 AwaitExpression 还是 Identifier」**：那是**上下文判据**（TS 的
`isAwaitExpression`：async 上下文里是；否则只有「下一 token 是标识符/关键字/字面量且同一行」才是），
`ExpressionBuilder.ParseUnary` 已经用 `IsAwaitExpressionStart` 实现了一份。收口器因此**不自己建节点**，
而是把 `Raw` 那一格交给 legacy `ParseUnary()`，并要求它恰好消费到本形状节点声明的最后一个单元——
不一致就整条回 legacy。这样「`(await a).b` 是 AwaitExpression」与「`await (1)` 是调用」两种判型
都不会建错树。

## static field KindYield:int = 33

`yield` 操作数（Stage 5d-8b）：与 `KindAwait` 同形（`Data` = 操作数或空、`Raw` = `yield` 单元）。
判型同样在 legacy `ParseUnary` → `ParseYield`（generator 上下文 / lookahead / 换行三条判据都在那里），
收口器只核「消费到的末单元与本形状节点声明的一致」。

**为什么它们占的是「前缀位」**：`await a + b` 在 TS 里是 `(await a) + b`（`await` 的操作数是 `ParseUnary`），
而 `yield a + b` 是 `yield (a + b)`（操作数是 `ParseAssign`）。形状层只把「紧邻的那一个操作数」包进去，
两种口径的差别**不会**在这里被猜——`yield a + b` 的 `+` 会落在 `KindYield` 外面，收口时
legacy 消费的末单元与形状节点声明的区间不一致，判否回 legacy（保守方向）。

## constructor:(template:Template)=>void

```ts
super(template);
```

# class StatementOperatorBody
**表达式体的增量状态机**（Stage 3 S3a/S3b，设计 §4.2）：壳（`StatementShape`，`Kind = ShellPlainExpression`）每攒到一个
basic token 就把新单元喂进来一格，本类**立刻**建对应的节点：

- 需要操作数（`Expect == 1`）时：标识符 / 数字 / 大整数 / `true false null this` / 圆括号 → 建叶子；
  前缀 `! ~ + -` 与 `typeof/void/delete` → 建前缀节点（S3d 的集合直接取自 `OperatorTable.IsPrefixOperator`，
  `++`/`--` 仍不接，留给未覆盖清单）；
- 需要运算符（`Expect == 2`）时：**全部** `OperatorTable` 二元运算符（S3d：比较族、逻辑 `&& || ??`、位 `& | ^`、
  移位 `<< >> >>>`、右结合幂 `**`、关键字 `instanceof`/`in`）→ 从 `OperatorTable` 读优先级与结合性，**立刻**建 `KindOperator` 节点，
  用 `ShapeInsertUtil.InsertBetween` 把它插到「当前帧（帧空则是根持有者）与最后一个子单元」之间——
  已经建好的子表达式原地变成新节点的左操作数。优先级不高于栈顶且栈顶已完整时先弹栈（左结合收敛），
  右结合（`**`）按 `OperatorTable.IsRightAssociative` 处理。

`Frames` 是**正在进行的二元节点栈**（栈顶 = 最内层、`FramePending[top] == true` 表示还在等右操作数）；
`Expect` 是 `ExpectOperand = 1` / `ExpectOperator = 2` 两态。两者都是**壳状态**（`StatementShape.OperatorBody` 字段持有），
跨格保留，不重建。

**栈不负责「结束」**：`Frames` 里的节点只在「后面来了更低/同级优先级的运算符」时弹（那是收敛，不是收口），
所以一条表达式跑完时栈里往往还压着一串**已完整**（`FramePending == false`）的节点。判定「结构已完整」因此**不看栈长**，
只看 `IsComplete()`（`Expect == ExpectOperator` 且每一帧都不再等右操作数）。

**结构文本发布**：同一个体在 `ShapeTexts` 里只占**一个槽位**，每格覆盖。因为 `IngestAll` 是逐格调的，
中途可能「恰好完整」（`-a+b` 在 `a` 之后是 `-(a)`，`1*2+3` 在 `2` 之后是 `*(1,2)`），只有最后一格的覆盖结果才是整条表达式的结构。

**ASI 的先行单元不是本体的**：换行边界要向前看一个单元才能定，所以下一个语句的首个标识符可能先被喂进本壳。
遇到「期望运算符、却来了一个能当操作数起点的 `Common`」时判为**语句边界**（`Closed`）并撒手，
不算未实现构造——否则会把已经完整的 `a+b` 撤回、还丢掉一条结构证明。

**不支持就停**：任何没实现的单元（成员访问 `.`、调用 `(`、索引 `[`、数组 `[` / 对象 `{` 字面量、
字符串/模板/正则字面量、赋值 `=` 与复合赋值、逗号、条件 `?:`、`as`/`satisfies`、`++`/`--`、`new` …）
一律 `Incomplete = true` 并**停止摄入**，
**不抛错、不建错树**——AST 仍由既有 `StatementBuilder` 从 raw 单元逐字节建成（XML 与 legacy 一致），
未接的构造逐条列在 `HANDOFF-s3-ops.md` 的未覆盖清单里。

## field Template:Template

建节点用的模板。

## field Root:Token | null = null

根持有者（懒建，`Kind = KindHolder`）。它只有一个子单元：最外层的那个表达式节点。

## field Frames:Array<Token> = []

正在进行的二元节点栈（栈顶是最内层）。每个元素的 `Data` 是 `[左操作数]`（等右操作数）或 `[左操作数, 右操作数]`（已完整）。

## field FramePrecs:Array<int> = []

与 `Frames` 一一对应的优先级（`OperatorTable.Precedence` 的原始数值，不留第二份）。

## field FramePending:Array<bool> = []

与 `Frames` 一一对应：`true` = 这个二元节点还在等右操作数。

## field AwaitName:Token | null = null

**正在等成员名**的成员节点（S3f）：读到 `.` 时建出来、插好位置，等下一个非 trivia 单元当名字。
非空就表示状态机停在 `ExpectName`。名字到达后立刻清空。

## field AwaitOptional:Token | null = null

**正在等 `?.` 之后那个单元**的节点（S3g）：读到 `?.` 时建出来、插好位置，转 `ExpectOptional`。
名字 / 调用 / 索引到达后立刻清空。

## field AwaitMeta:bool = false

**正在等 `new.target` 的 `target`**（Stage 5d-7）：`new` 之后紧跟 `.` 时，那个 `KindNew` 前缀节点被改写成
`KindNewTarget` 并挂成 `AwaitName`；`true` 表示名字到达后要把它当作**操作数**挂进当前帧
（它不是 `new` 的被构造者，没有「构造」这一步）。

## field AwaitPrivate:Token | null = null

**正在等私有名（`#x`）那个名字**的节点（Stage 5d-7）：`#` 是独立的一格（`Symbol`），名字是下一格 `Common`，
两格合成一个 `PrivateIdentifier`。本字段非空就表示「还差名字」：
成员位（`this.#x`）由 `IngestName` 接名字，操作数位（`#x in obj`）由 `ExpectPrivateName` 接名字。

## field Prefixes:Array<Token> = []

已经读到、但操作数还没到的前缀节点（`-a` 的 `-`）。操作数到达时按后进先出包上去，再挂进当前帧。

## field AwaitBody:Token | null = null

**正在等类体的函数/类节点**（S3l）：`function` / `class` 在操作数位置建出 `KindFunction` / `KindClass` 之后，
状态机停在 `ExpectBody`，头部单元（名字 / 类型参数 / `extends` 遗产子句 / 实参括号）一律跳过，
第一个 `{` 括号（函数体 / 类体）到达后收口并清空。它和 `AwaitName` / `AwaitOptional` 一样只是「等什么」的标记。

## field ArrowBodyUnits:int = 0

**箭头体已经吞掉的单元数**（S3l）：`ExpectArrowTail` 下 `IsComplete()` 的唯一判据——箭头体可以是一个表达式
（多个单元）也可以是一个块（一个 `{…}` 括号单元），只要体里至少来了一格，箭头就完整了。

## field TypeTailUnits:int = 0

**类型断言之后吞掉的单元数**（Stage 5d-7）：`ExpectTypeTail` 下 `IsComplete()` 的唯一判据。
`as` / `satisfies` 右边是**类型**不是表达式，形状层不解析类型（那是 `TypeBuilder` 的事），所以这里只负责
「把 `as` 之后属于这条语句的单元吞掉、停在完整」；真正的类型区间由收口器从 `as` 之后交给 legacy
`ExpressionBuilder.ParseFollowingType`，并要求它**恰好**吃到本形状节点声明的最后一个单元
（`claimedLast + 1`，Stage 5d-8b；原先要求吃到整条语句末尾，那会把 `a as T + b` / `a ? b as T : c`
这种「类型之后还有表达式」一律判死）。判错的代价不对称：吞多了收口器会因长度不一致而拒绝
（少接管一条，legacy 仍对）；不会建错树。

## field TypeTailAngle:int = 0

**类型区域里的尖括号深度**（Stage 5d-8b）：`ExpectTypeTail` 每吞一格就更新（`<` +1、`>` -1、
`>>` / `>>>` 按层减）——它是「`,` 算不算类型里的分隔符」的唯一判据：`a as Foo<A, B>` 的逗号在深度 1，
`a as T, b` 的逗号在深度 0（属于逗号表达式，类型区域到此为止）。

## field TypeTailQuestion:bool = false

**类型区域里出现过 `?`**（Stage 5d-8b）：条件类型 `T extends U ? X : Y` 的 `:` 属于类型，
只有没出现过 `?` 时 `:` 才是外层条件表达式的冒号。这是 `a ? b as T : c` 判得出来的最小依据。

## field Conditionals:Array<Token> = []

**正在等冒号**的条件节点栈（S3h）：`a ? b ? c : d : e` 的外侧与内侧同时等冒号，而最近一个 `:` 属于最内层，
所以用栈而不是单指针。入栈于 `StartConditional`、出栈于 `CloseConditional`。

## field Expect:int = 1

期望状态：`1` = 下一个代码单元应当是操作数（或前缀）；`2` = 应当是一个二元运算符，或表达式到此为止。

## field Ingested:int = 0

已经喂进本状态机的单元数（含 trivia）：`IngestAll` 只从它往后扫，**只追加**，不重扫前缀。

## field Units:Array<Token> = []

本壳当前的单元序列（`IngestAll` 每次覆盖成入参）。只给「`<` 是小于号还是类型实参表」这一处向前看用，
不参与建树：`Ingest` 拿 `Ingested - 1` 当游标去 `AmbiguousTypeArguments` 里看后面的单元。

## field PreviousUnit:Token | null = null

本壳上一次喂进 `Ingest` 的单元（`++` / `--` / `!` 的「换行即前缀」判据要看它，Stage 5d-9a）。

**为什么记字段而不是从 `Ingested` 反推**：`Ingest` 会被自身递归调用（`,` 收箭头顶层逗号、
类型区域收口两处 `this.Ingest(unit, template)`）——那两处 `Ingested` 不前进，反推会拿到错误的「前一格」。
字段在 `Ingest` 开头无条件更新一次，递归那两格的「前一格」就是它自己（`HasBetween(x, x)` 恒假，
所以换行判据在递归里不会误判）。

## field SawLessThan:bool = false

本壳已经摄入过 `<`。`<` 是「类型实参调用」歧义的唯一来源，`IngestAll` 收尾的 `HasTypeArgumentCall` 是一遍全表扫描；
没有 `<` 时该判据恒假，扫描纯属白跑（scale 用例剩余的那点二次项正是它）。所以只在它为真时才扫。
## field Incomplete:bool = false

遇到未实现的构造：停止摄入，本壳放弃表达式体（AST 不受影响）。

## field Reason:string = ""

`Incomplete` 的原因（诊断用，进 `HANDOFF-s3-ops.md` 的未覆盖清单就靠它）。

## field Inserts:int = 0

本状态机调用 `ShapeInsertUtil.InsertBetween` 的次数——**增量插入的取证**：整段 builder 建树不会让它是正数。

## field Closed:bool = false

语句边界（ASI）已经落在本表达式之后：下一个单元属于下一个语句，停止摄入但**不算未实现**，已发布的结构照旧有效。

## field Nested:bool = false

本实例是不是圆括号内部建的**嵌套体**（`BuildOperand` 里建）：嵌套体的结构只属于外层括号节点，
**不单独发布**到 `ShapeTexts`，也不计入 `TotalBodies`。

## field ArrowParamTable:bool = false

「宿主括号后面紧跟 `=>`」的嵌套体标记（S3n 参数表保护）：为 `true` 时，本体内出现的逗号是**参数分隔符**
而不是逗号运算符，`Ingest` 直接 `Fail`——`BuildOperand` 于是把括号退回**未解析参数表**（`params`），
箭头仍由 legacy `ParseAssign` 的箭头分支建树，与 S3l 的 `(a, b) => …` 完全同形。

**为什么需要它**：`(a, b)` 的圆括号同时是「参数表候选」与「括号表达式」。S3l 时代逗号不是运算符，
括号内体必然失败、天然退成 `params`；S3n 让逗号可解析之后，若不看前瞻，`(a, b) => …` 会变成
`arrow((a,b))`（参数表被当成逗号表达式），与 legacy 的箭头树不同形，`op-ast-proof` 的箭头用例立刻红。
只看宿主括号之后的下一个代码单元是不是 `=>`，不改 `StartArrow`、不拆参数表。

## field Slot:int = -1

本体在 `ShapeTexts` 里的槽位；`-1` 表示还没发布过。同一个体每格求值都把**同一个槽位覆盖**成最新结构——
中间格可能只是「前缀恰好完整」（`-a+b` 的 `-(a)`），最终格才是整条表达式的结构。

## field Counted:bool = false

`TotalBodies` 只在本体第一次 `IngestAll` 时 +1（嵌套体不算）：建体与摄入在同一处发生，括号内部不会被重复计数。

## static field ExpectOperand:int = 1

## static field ExpectOperator:int = 2

## static field ExpectName:int = 3

成员名的状态（S3f）：`.` 之后要的不是操作数而是一个**名字**——名字不能被前缀包住（`a.-b` 不是成员访问），
所以它单独一个状态，而不是复用 `ExpectOperand`。

## static field ExpectOptional:int = 4

`?.` 之后的状态（S3g）：要的不是普通操作数也不是成员名，而是「成员名 / `(` / `[`」三选一，
所以单独一个状态（`IngestOptional` 分派）。

## static field ExpectBody:int = 5

`function` / `class` 的操作数位置（S3l）：要的是**函数体 / 类体**那个 `{…}` 括号，中间的头部单元全部跳过
（`IngestBody` 分派）。它不能复用 `ExpectOperand`：头部里的 `(` 是实参括号、`<` `>` 是类型参数、
名字是标识符，按表达式解释就会建出错树——S3g 的 `class` 守卫记录的正是这条错树路径。

## static field ExpectArrowTail:int = 6

`=>` 之后的状态（S3l）：箭头体整段吞掉（表达式体 / 块体都由 legacy 解析）。
箭头体是**赋值表达式**，优先级比任何二元运算符都低，所以 `=>` 一到，后面的单元全部属于这条箭头。

## static field ExpectTypeTail:int = 7

`as` / `satisfies` 之后的状态（Stage 5d-7）：右边是类型，形状层不解释，把剩下的单元全部吞掉
（`TypeTailUnits` 计数）。它不能复用 `ExpectOperand`：类型里的 `{}` / `[]` / `<` `>` 都会被当成表达式构造，
建出错树（`a as { x: 1 }` 的对象字面量、`a as T[]` 的数组字面量、`a as A<B>` 的比较链）。

## static field ExpectPrivateName:int = 8

`#` 之后的状态（Stage 5d-7）：要的是私有名的**名字**（`Common`），不是操作数、也不是成员名。
两格合成 `KindPrivateName` 之后才回到 `ExpectOperator`——操作数位（`#x in obj`）走这里；
成员位（`this.#x`）仍停在 `ExpectName`，由 `IngestName` 接名字。

## static field CondPrecedence:int = 1

条件表达式的帧优先级（S3h）：比一切二元运算符（最低 `??` = 4）低、比赋值
（`OperatorTable.AssignmentPrecedence` = 0）高。这个数值决定了 `?` 到达时弹到哪一层，见 `StartConditional`。

## static field TotalBodies:int = 0

进程内建过的表达式体个数（每建一条走壳的表达式语句 +1；圆括号内部的嵌套体不计）。

## static field TotalInserts:int = 0

进程内 `InsertBetween` 的累计次数（取证用；harness / proof 脚本读它）。

## static field TotalIncomplete:int = 0

进程内因未实现构造而放弃的表达式体个数。

## static field ShapeTexts:Array<string> = []

每个**结构已完整**的表达式体的最终结构文本，按体第一次发布时的顺序占一个槽位；同一体后续格覆盖同一槽位。
结构判据（`+(*(1,2),3)`）就是用它与期望逐字比；被判 `Incomplete` 的体会撤回自己的槽位，不留下半棵树。

## static field LastText:string = ""

最近一次 `IngestAll` 之后本体的结构文本（嵌套体不刷新）。

## static field LastComplete:bool = false

最近一次 `IngestAll` 之后本体是否「已完整」（`IsComplete()`：`!Incomplete && Expect == ExpectOperator && 无帧在等右操作数`）。

## constructor:(template:Template)=>void

```ts
this.Template = template;
```

## method Holder:()=>Token

根持有者懒建：第一次需要挂节点时才建（纯 trivia 的壳不会建它）。

```ts
if (this.Root === null) {
  const root = new StatementOperandShape(this.Template);
  root.Kind = StatementOperandShape.KindHolder;
  this.Root = root;
}
return this.Root;
```

## method Top:()=>Token

当前挂节点的父单元：栈非空是栈顶二元节点，否则是根持有者。

```ts
if (this.Frames.length > 0) {
  return this.Frames[this.Frames.length - 1];
}
return this.Holder();
```

## method IngestAll:(units:Array<Token>, template:Template)=>void

把壳里还没喂过的单元逐格喂进状态机（`Ingested` 只追加）。遇到未实现构造立刻停，不抛错。
语句边界（`Closed`）也停：边界之后的单元属于下一个语句。

每次喂完刷新 `LastText` / `LastComplete`；本体结构完整时把结构文本发布进自己的槽位（见 `Publish`）。
嵌套体（圆括号内部）只建树，不刷新进程级读数、不发布。

```ts
this.Units = units;
if (!this.Counted) {
  this.Counted = true;
  if (!this.Nested) {
    StatementOperatorBody.TotalBodies++;
  }
}
while (this.Ingested < units.length && !this.Incomplete && !this.Closed) {
  const at = this.Ingested;
  this.Ingested = at + 1;
  if (units[at].IsTriviaToken) {
    continue;
  }
  this.Ingest(units[at], template);
}
// 根层壳是**逐格**喂单元的：读到 `<` / `?.` 的那一格后面还没有单元，判据（要看配对 `>` 与 follower）
// 这时根本不成立。所以根层壳的类型实参尾巴一律推迟到 `Finish`（收口时 `Units` 是整条语句的全部单元）；
// 这里只处理**嵌套体**（圆括号 / 索引内部）：它们的 `Units` 就是括号 `Data`，一次给全。
if (this.SawLessThan && !this.Closed && this.Nested
  && (this.Incomplete || StatementOperatorBody.HasTypeArgumentCall(this.Units))) {
  // Stage 5d-7：`<` 既可能是小于号，也可能是**类型实参表的开头**。判成类型实参时重放前缀
  // （`ResetState` + 逐格 `Ingest` 到 `<` 之前）、把整段左表达式包成一格 `KindTypeArguments`，
  // 之后本体停在 `Closed`；AST 由收口器把 `<` 之后交给 legacy `ExpressionBuilder.ParsePostfixSuffix`
  // （那是类型实参调用 / 实例化表达式的唯一实现）。判否就保持原样（`Fail("类型实参调用")` 仍在，
  // 保守方向不变：少接管一条，legacy 仍对）。
  if (this.TryTypeArgumentTail(template)) {
    return;
  }
}
if (this.SawLessThan && !this.Incomplete && !this.Closed && StatementOperatorBody.HasTypeArgumentCall(this.Units)) {
  this.Fail("类型实参调用");
}
if (this.Nested) {
  return;
}

```

## method Finish:()=>void

本体的**收口**：语句建树前由壳调用一次（`StatementShape.BuildFromShell`），把最终结构文本求值并发布。

**为什么不在 `IngestAll` 每格求**：`Text()` 要递归渲染整棵形状树，而 `IngestAll` 是**逐格**调的
（`a1+a2+…+aN` 每来一个操作数就一次），每格都渲染 = O(n²) 字符拷贝。结构文本只在语句收口时被读
（`ShapeTexts` / `LastText`），中间的「恰好完整」结构会被后一格覆盖，所以每格求值没有消费者：
改成收口时求一次，`ShapeTexts` 的最终槽位内容与顺序完全不变（每体一个槽位、按语句建树顺序占位）。

```ts
// Stage 5d-7：根层壳的类型实参尾巴在这里才判——`Units` 现在是整条语句的全部单元，
// `AngleJudge.CanStart` 的配对扫描与 follower 白名单才有意义（见 `TryTypeArgumentTail`）。
// 条件里**不**要求 `HasTypeArgumentCall`：实例化表达式（`f<string>` / `f<string, number>`）后面
// 没有调用括号，`HasTypeArgumentCall` 判否，只有 `AngleJudge.CanStart` 认得出它。
if (!this.Closed && this.SawLessThan) {
  this.TryTypeArgumentTail(this.Template);
}
// Stage 5d-8b：`yield` / `await` 的「有没有操作数」也在这里定（壳逐格喂单元时看不到后面的操作数）。
// 还挂着的 `KindYield` / `KindAwait` 自己就是操作数（`x = yield`），挂进当前帧。
if (!this.Closed && !this.Incomplete) {
  this.AttachDanglingAwaitYield();
}
if (this.Nested || this.Incomplete || !this.IsComplete()) {
  return;
}
const text = this.Text();
StatementOperatorBody.LastText = text;
StatementOperatorBody.LastComplete = true;
if (text !== "") {
  this.Publish(text);
}
```
## method IsComplete:()=>bool

结构是否已完整：不再等任何右操作数，且最后一个代码单元是操作数。**不看 `Frames.length`**（栈里压着的都是已建完的节点，
弹栈只发生在优先级收敛时，收口时不需要也不应该弹）。

```ts
if (this.Incomplete) {
  return false;
}
if (this.Expect === StatementOperatorBody.ExpectArrowTail) {
  // S3l：箭头体全部吞掉，`Expect` 永远回不到 `ExpectOperator`；体里至少有一格就算完整。
  return this.ArrowBodyUnits > 0;
}
if (this.Expect === StatementOperatorBody.ExpectTypeTail) {
  // Stage 5d-7：`as` / `satisfies` 的类型区域已经吞到末尾；类型区间本身的正确性由收口器核
  // （`StatementShapeAst` 必须让 `ParseFollowingType` 恰好吃完剩余单元，否则拒绝接管）。
  return this.TypeTailUnits > 0;
}
if (this.Expect !== StatementOperatorBody.ExpectOperator) {
  return false;
}
for (let index = 0; index < this.FramePending.length; index++) {
  if (this.FramePending[index]) {
    return false;
  }
}
return true;
```

## method Publish:(text:string)=>void

发布（或覆盖）本体的结构文本：第一次发布时占一个新槽位，之后每格覆盖同一槽位——
这样中途「恰好完整」的中间结构不会作为独立条目留在 `ShapeTexts` 里。

```ts
if (this.Slot < 0) {
  this.Slot = StatementOperatorBody.ShapeTexts.length;
  StatementOperatorBody.ShapeTexts.push(text);
  return;
}
StatementOperatorBody.ShapeTexts[this.Slot] = text;
```

## method Ingest:(unit:Token, template:Template)=>void

一格的状态机转移（只处理**一个**非 trivia 单元）：

- `;` / `EOF`：表达式到此为止，不改状态（收口由壳的终结候选负责）；
- `Expect == ExpectOperand`：前缀 → 压栈；否则建操作数叶子，包上前缀后挂进 `Top()`，转 `ExpectOperator`；
- `Expect == ExpectOperator`：`+ - * / %` → `PushBinary`；能当操作数起点的 `Common` → `Closed`（ASI 边界，下一个语句的）；
  其余一律 `Fail`。

```ts
// Stage 5d-9a：**上一格的单元**（`++` / `--` / `!` 的换行判据用）。递归调用（`,` / 类型区域收口）
// 不推进 `Ingested`，所以只能记字段；递归那一格的「上一格」是它自己，换行判据因此恒为假。
const previousUnit = this.PreviousUnit;
this.PreviousUnit = unit;
// Stage 5d-8b：**类型区域 / 箭头体里的 `<` 不算歧义来源**。`a as A<B>` 的 `<` 属于 `as` 之后的类型
// （`A<B>` 是类型引用），`x => f<T>(a)` 的 `<` 属于箭头体（由 legacy `ParseAssign` 整段建）。若照旧记
// `SawLessThan`，收口时 `TryTypeArgumentTail` 会为它重放前缀——而重放停在 `as` / `=>` 处，
// 本体从此只剩半条（后续单元既不摄入也不再完整），白白丢掉一条接管。这里只在**表达式位**记它。
// Stage 5d-9a：**函数 / 类表达式的头部里的 `<` 同理**（`ExpectBody`）——`(function <T>(x: T) {…})`
// 的 `<T>` 是类型参数表，不是类型实参调用；照旧记会让嵌套体在收口时被 `TryTypeArgumentTail` 重放，
// 重放上界正好落在 `<` 上（`Expect` 停在 `ExpectBody`），嵌套体从此半条 → 括号退成未解析参数表
// → 外层在 `(1)` 那一格 `Fail("圆括号参数表后面不是 =>")`。
if (unit instanceof Symbol && (unit as Symbol).Is("<")
  && this.Expect !== StatementOperatorBody.ExpectTypeTail
  && this.Expect !== StatementOperatorBody.ExpectArrowTail
  && this.Expect !== StatementOperatorBody.ExpectBody) {
  this.SawLessThan = true;
}
if (unit instanceof EndOfFileTokenShape) {
  return;
}
if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
  return;
}
const text = StatementOperatorBody.TextOfToken(unit);
if (this.Expect === StatementOperatorBody.ExpectName) {
  this.IngestName(unit, text, template);
  return;
}
if (this.Expect === StatementOperatorBody.ExpectOptional) {
  this.IngestOptional(unit, text, template);
  return;
}
if (this.Expect === StatementOperatorBody.ExpectBody) {
  this.IngestBody(unit);
  return;
}
if (this.Expect === StatementOperatorBody.ExpectArrowTail) {
  // S3l：箭头体整段吞掉（表达式体的每一格 / 块体那一个括号单元），不建节点。
  //
  // Stage 5d-8b：**顶层逗号不在箭头体里**——`x => a, b` 在 legacy 里是 `(x => a), b`
  // （`ParseAssign` 建完箭头就返回，逗号属于外层 `ParseExpression`）。所以见到 `,` 就收口、
  // 把箭头标成完整，再让这一格按普通运算符（逗号）处理。`x => (a, b)` / `x => f(a, b)` 的逗号
  // 在括号单元内部，根本不是独立单元，因此不受影响。
  if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
    this.Expect = StatementOperatorBody.ExpectOperator;
    this.Ingest(unit, template);
    return;
  }
  this.ArrowBodyUnits++;
  // 箭头节点就是当前表达式的最后一个子单元（`StartArrow` 把参数原地换成了 `KindArrow`）。
  // 记下被吞掉的最后一格：收口器据此核「legacy `ParseAssign` 消费到的末单元」与形状树声明的一致
  // （与类型断言的 `TailEnd` 同一口径）。
  const arrowTop = this.Top();
  if (arrowTop.Data.length > 0) {
    const last = arrowTop.Data[arrowTop.Data.length - 1];
    if (last instanceof StatementOperandShape
      && (last as StatementOperandShape).Kind === StatementOperandShape.KindArrow) {
      (last as StatementOperandShape).TailEnd = unit;
    }
  }
  return;
}
if (this.Expect === StatementOperatorBody.ExpectTypeTail) {
  // Stage 5d-7：`as` / `satisfies` 之后的类型区域整段吞掉（不建节点、不看成表达式构造）。
  // Stage 5d-8b：**类型之后还能接表达式**（`a as T + b` / `a ? b as T : c` / `a as T, b`）——
  // 见到「不可能是类型一部分」的那一格就收口：本帧标完整、回到操作符位，并把这一格**重新**按运算符处理。
  if (this.EndsTypeTail(unit)) {
    if (this.Frames.length > 0 && !this.FramePending[this.FramePending.length - 1]) {
      this.CompleteTop();
    }
    this.Expect = StatementOperatorBody.ExpectOperator;
    this.Ingest(unit, template);
    return;
  }
  this.TrackTypeTail(unit);
  this.TypeTailUnits++;
  if (this.Frames.length > 0) {
    const tail = this.Frames[this.Frames.length - 1];
    if (tail instanceof StatementOperandShape) {
      (tail as StatementOperandShape).TailEnd = unit;
    }
  }
  return;
}
if (this.Expect === StatementOperatorBody.ExpectPrivateName) {
  // Stage 5d-7：`#x` 的第二格（名字）。两格合成 `KindPrivateName` 之后才是操作数。
  const pending = this.AwaitPrivate;
  if (pending === null || !(unit instanceof Common)) {
    this.Fail("私有名不是标识符");
    return;
  }
  const leaf = new StatementOperandShape(template);
  leaf.Kind = StatementOperandShape.KindIdentifier;
  leaf.Text = text;
  leaf.Raw = unit;
  pending.Add(leaf);
  this.AwaitPrivate = null;
  this.AttachOperand(pending);
  this.Expect = StatementOperatorBody.ExpectOperator;
  return;
}

if (this.Expect === StatementOperatorBody.ExpectOperator && this.StartsNextStatement(unit)) {
  // Stage 5d-8b：换行之后出现一条**新语句的起点**（`typeof (x)` ⏎ `void (0)` / `a.class` ⏎ `{}` /
  // `"use strict"` ⏎ `function …`）——旧逻辑会把这一格当成「续不上表达式的运算符」直接 `Fail`，
  // 于是本可以接管的那条语句退回 legacy。这里改成「表达式到此为止」（`Closed`，不算未实现）。
  this.Closed = true;
  return;
}
if (this.Expect === StatementOperatorBody.ExpectOperand) {
  if (text === "class") {
    this.StartDeclarationOperand(unit, text, StatementOperandShape.KindClass, template);
    return;
  }
  if (text === "function") {
    this.StartDeclarationOperand(unit, text, StatementOperandShape.KindFunction, template);
    return;
  }
  if (text === "new") {
    this.StartNew(unit, template);
    return;
  }
  if (text === "yield" || text === "await") {
    // Stage 5d-8b：`await` / `yield` 的操作数位。判型（AwaitExpression / YieldExpression / Identifier）
    // 与「有没有操作数」都交给 legacy（见 `StartAwaitYield`）。
    this.StartAwaitYield(unit, text, template);
    return;
  }
  if (text === "." && this.StartNewTarget(unit, template)) {
    // `new.target`（Stage 5d-7）：`new` 之后紧跟 `.` 且 `new` 还没有被构造者 —— 这一格是 MetaProperty。
    return;
  }
if (text !== "" && StatementOperatorBody.IsPrefixText(text, unit)) {
    const prefix = new StatementOperandShape(template);
    prefix.Kind = StatementOperandShape.KindPrefix;
    prefix.Text = text;
    prefix.Raw = unit;
    this.Prefixes.push(prefix);
    return;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("#")) {
    // Stage 5d-7：操作数位的私有名（`#x in obj`）：`#` 一格、名字下一格，合成 `KindPrivateName`。
    const privateShape = new StatementOperandShape(template);
    privateShape.Kind = StatementOperandShape.KindPrivateName;
    privateShape.Raw = unit;
    this.AwaitPrivate = privateShape;
    this.Expect = StatementOperatorBody.ExpectPrivateName;
    return;
  }
  const leaf = this.BuildOperand(unit, template);
  if (leaf === null) {
    this.Fail(text === "" ? "单元" : "操作数 " + text);
    return;
  }
  this.AttachOperand(leaf);
  this.Expect = StatementOperatorBody.ExpectOperator;
  return;
}
  // S3m：`async function …` 的 `function` 出现在操作数 `async` 之后，必须继续走声明操作数，
  // 不能落到最后的 `Fail`（否则括号内本体不完整，整段退成 `params`，永远接不住 async 函数表达式）。
  if (text === "function") {
    const top = this.Top();
    const last = top.Data.length > 0 ? top.Data[top.Data.length - 1] : null;
    if (last instanceof StatementOperandShape
      && (last as StatementOperandShape).Kind === StatementOperandShape.KindIdentifier
      && (last as StatementOperandShape).Text === "async") {
      this.StartDeclarationOperand(unit, text, StatementOperandShape.KindFunction, template);
      return;
    }
  }
  if (text === "=>") {
    this.StartArrow(unit, template);
    return;
  }
  if (this.HasLooseParen()) {
    this.Fail("圆括号参数表后面不是 =>");
    return;
  }
  if (text !== "" && OperatorTable.IsAsOperator(text)) {
    // Stage 5d-7：`as` / `satisfies` 是**类型运算符**（优先级与集合都由 `OperatorTable` 提供，
    // 与 `ExpressionBuilder.IsTypeOperator` 同一判据）：右边是类型，形状层不建它，
    // 只把「当前表达式」包成一格 `KindTypeAssert`，随后进入 `ExpectTypeTail` 把类型区域吞掉。
    this.StartTypeAssert(unit, text, template);
    return;
  }
  if (text !== "" && OperatorTable.IsAssignmentOperator(text)) {
    this.PushAssignment(unit, text, template);
    return;
  }
  if (text === ",") {
    // S3n：逗号表达式（`Expression := AssignmentExpression ("," AssignmentExpression)*`）。
    // 优先级只取 `OperatorTable.CommaPrecedence`（比赋值帧还低、左结合），**不经过 `PushBinary`**——
    // `Precedence(",")` 仍是未知哨兵 -1、`IsBinaryOperator(",")` 仍为 false，legacy 的二元循环看不见它。
    if (this.ArrowParamTable) {
      // 参数表保护：宿主括号后面紧跟 `=>`，这里的逗号是参数分隔符而不是运算符。让本嵌套体不完整，
      // 括号因此退回未解析参数表（`params`），箭头仍由 legacy `ParseAssign` 的箭头分支建（与 S3l 同形）。
      this.Fail("圆括号参数表里的逗号");
      return;
    }
    if (this.Frames.length > 0
      && this.FramePrecs[this.FramePrecs.length - 1] === StatementOperatorBody.CondPrecedence) {
      // 条件帧**永不被 `PushOperator` 弹掉**（S3h：`a ? b : c = d` 的赋值属于假分支），而逗号比条件还低：
      // `a ? b : c, d` 的正确结构是 `(a ? b : c), d`（legacy `ParseExpression` 的逗号循环里，左操作数
      // 已经是一整个条件）。所以这里先收掉**已经闭合**的条件帧，让逗号落在它外面（Stage 5d-8b）；
      // 条件帧还在等分支（`a ? b, c`，非法）就照旧判不完整、整条退 legacy。
      while (this.Frames.length > 0
        && this.FramePrecs[this.FramePrecs.length - 1] === StatementOperatorBody.CondPrecedence) {
        if (this.FramePending[this.FramePending.length - 1]) {
          this.Fail("条件表达式与逗号的分层");
          return;
        }
        this.CompleteTop();
      }
    }
    this.PushOperator(unit, text, OperatorTable.CommaPrecedence, false, template);
    return;
  }
  if (text !== "" && StatementOperatorBody.IsSupportedBinary(text)) {
    this.PushBinary(unit, text, template);
    return;
  }
  if (text === "?") {
    this.StartConditional(unit, template);
    return;
  }
  if (text === ":") {
    this.CloseConditional(unit);
    return;
  }
  if ((text === "++" || text === "--" || text === "!") && previousUnit !== null
    && LineTerminator.HasBetween(previousUnit.SourceRange, unit.SourceRange)) {
    // Stage 5d-9a：`++` / `--` / `!` 是**不能跨行**的后缀（TS `parsePostfixExpressionOrHigher` 的
    // `scanner.hasPrecedingLineBreak()` 守卫）：`a` ⏎ `++b` / `a` ⏎ `!b` 在 TS 里是两条语句，
    // 换行之后那个 `++` / `--` / `!` 是**前缀**、操作数在下一行。本状态机原来无条件把它当后缀
    // （`StartPostfix` / `StartNonNull`），于是形状树长出一格**语句单元之外**的操作符单元，
    // 收口器只好拒绝（`后缀运算符单元不在表达式里` / `非空断言的 ! 单元不在表达式里`）。
    // 这里按 TS 的同一句判据收口：表达式到此为止（`Closed`，不算未实现），下一格属于下一条语句。
    this.Closed = true;
    return;
  }
  if (text === "++" || text === "--") {
    this.StartPostfix(unit, text, template);
    return;
  }
  if (text === "!") {
    this.StartNonNull(unit, template);
    return;
  }if (text === "?.") {
  this.StartQuestionDot(unit, template);
  return;
}
if (text === ".") {
  this.StartMember(unit, template);
  return;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
  if (this.AcceptNewArgs(unit as Bracket)) {
    return;
  }
  this.StartCall(unit as Bracket, template);
  return;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
  this.StartIndex(unit as Bracket, template);
  return;
}
if (unit instanceof String && StatementOperatorBody.IsTemplateUnit(unit as String, template)) {
  // Stage 5d-7：操作数位置之后的模板串是**标签模板**（`tag`t``）——不是普通模板操作数
  // （那个只在 ExpectOperand 里由 `BuildOperand` 建 `KindTemplate`）。宿主就是当前表达式：
  // StartTaggedTemplate 走 InsertionPoint 原地插节点，所以 `a!` / `[a,b]` / `new C()` / `a?.b()` 这些
  // 「非常规被标宿主」不需要各自判据——它们已经作为形状节点在树上了。
  this.StartTaggedTemplate(unit, template);
  return;
}
if (unit instanceof Common && StatementOperatorBody.IsOperandText(text)) {
  // S3m：`async x => …` 的 `x` 紧跟在 `async` 之后。普通规则会把它当「下一个语句的起点」（`Closed`），
  // 于是表达式只建出 `async` 一个根、`x => x` 落在壳外。这里只在「前一子单元正是 async 标识符」时
  // 把它收成第二个操作数；后面真来 `=>` 就由 StartArrow 把 async 摘进参数（否则 AST 收口时多根 Decline，退回 legacy）。
  const top = this.Top();
  const last = top.Data.length > 0 ? top.Data[top.Data.length - 1] : null;
  if (last instanceof StatementOperandShape
    && (last as StatementOperandShape).Kind === StatementOperandShape.KindIdentifier
    && (last as StatementOperandShape).Text === "async") {
    const leaf = this.BuildOperand(unit, template);
    if (leaf !== null) {
      this.AttachOperand(leaf);
      return;
    }
  }
  this.Closed = true;
  return;
}
this.Fail(text === "" ? "单元" : "运算符 " + text);
```

## method BuildOperand:(unit:Token, template:Template)=>Token | null

建一个操作数叶子；不认识的构造返回 `null`（由调用方 `Fail`，不抛错）。

- `(`…`)`：用**一个新的嵌套本体**把括号里的单元全部喂一遍，再包一个 `KindParen` 节点。括号里的 raw 单元是括号自己的
  `Data`（不是壳的 `Data`），所以可以整段喂——这正是「括号可选」在 S3b 里的落地方式；
- `Common` 且不是保留字/前缀关键字：`LooksNumber` 分 `KindNumber` / `KindIdentifier`——`KindNumber` 用的是
  `Common.IsNumber()` / `Common.IsBigInt()`（即两个字面量工厂的入参判据），所以 `.5` / `.5e2` / `1.` 都归数字；
  「像数字开头但不是合法字面量」的非法源码（`1_` 之类）返回 `null`，既不建 Identifier 也不建错树；
- 其余（字符串/模板/正则/`[`/`{`）：`null`。

```ts
if (unit instanceof Common && (unit as Common).Is("import")) {
  // 表达式位的 `import`：只吃一格建关键字叶子，`.` / `(` 交给后面的普通后缀候选。
  const keyword = new StatementOperandShape(template);
  keyword.Kind = StatementOperandShape.KindImportKeyword;
  keyword.Text = "import";
  keyword.Raw = unit;
  return keyword;
}
if (unit instanceof RegexToken) {
  const shape = new StatementOperandShape(template);
  shape.Kind = StatementOperandShape.KindRegex;
  shape.Raw = unit;
  return shape;
}
if (unit instanceof String) {
  const token = unit as String;
  if (StatementOperatorBody.IsTemplateUnit(token, template)) {
    const shape = new StatementOperandShape(template);
    shape.Kind = StatementOperandShape.KindTemplate;
    shape.Raw = unit;
    return shape;
  }
  const shape = new StatementOperandShape(template);
  shape.Kind = StatementOperandShape.KindString;
  shape.Raw = unit;
  return shape;
}
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar === "[") {
    const arrayShape = new StatementOperandShape(template);
    arrayShape.Kind = StatementOperandShape.KindArray;
    arrayShape.Raw = unit;
    return arrayShape;
  }
  if (bracket.StartBracketChar === "{") {
    // Stage 5d-8b：`new { … }()` —— `{` 在**操作数位**上紧跟还开着的 `KindNew` 前缀时是对象字面量
    // （`new` 的被构造者），不是块语句。判据只认「栈顶前缀正是还没挂子节点的 `KindNew`」这一种形态
    // （`AwaitNewCallee`），其它顶层 `{` 照旧返回 `null`（块体边界，本体不解释）。
    if (!this.Nested && !this.AwaitNewCallee()) {
      return null;
    }
    const objectShape = new StatementOperandShape(template);
    objectShape.Kind = StatementOperandShape.KindObject;
    objectShape.Raw = unit;
    return objectShape;
  }
  if (bracket.StartBracketChar !== "(") {
    return null;
  }
  const inner = new StatementOperatorBody(template);
  inner.Nested = true;
  inner.ArrowParamTable = StatementOperatorBody.ParenFeedsArrow(this.Units, bracket);
  inner.IngestAll(bracket.Data, template);
  if (inner.Incomplete || !inner.IsComplete()) {
    // S3l：`(a, b) => …` 的参数表 / 空参数 `()` / 解构参数不是表达式，形状层不解释括号内容，
    // 只留一个**未解析参数表**（`Data` 为空、渲染成 `params`）。只有后面真的来 `=>` 才成立，
    // 否则 `HasLooseParen` 会 Fail（安全退回 legacy，不建错树）。
    const loose = new StatementOperandShape(template);
    loose.Kind = StatementOperandShape.KindParen;
    loose.Raw = bracket;
    return loose;
  }
  const shape = new StatementOperandShape(template);
  shape.Kind = StatementOperandShape.KindParen;
  shape.Raw = bracket;
  if (inner.Root !== null && inner.Root.Data.length > 0) {
    shape.Add(inner.Root.Data[0]);
  }
  return shape;
}
if (unit instanceof Common) {
  const common = unit as Common;
  const text = common.TempToString();
  if (StatementOperatorBody.IsKeywordLeafText(text)) {
    const shape = new StatementOperandShape(template);
    shape.Kind = StatementOperandShape.KindKeyword;
    shape.Text = text;
    shape.Raw = unit;
    return shape;
  }
  if (text === "super") {
    // Stage 5d-7：`super` 也是关键字叶子（`super()` / `super.m()` / `super[k]` 由随后的普通后缀接上）。
    // legacy `ExpressionBuilder.ParsePrimary` 的 super 分支用 `SuperKeywordShape` + `MakeKeywordLeaf`，
    // 收口器（`StatementShapeAst` 的 `KindKeyword` 分支）用同一个工厂，所以节点逐字段同源。
    const shape = new StatementOperandShape(template);
    shape.Kind = StatementOperandShape.KindKeyword;
    shape.Text = text;
    shape.Raw = unit;
    return shape;
  }
  if (!StatementOperatorBody.IsOperandText(text)) {
    return null;
  }
  const number = StatementOperatorBody.LooksNumber(common);
  if (!number && common.CanStartNumber()) {
    return null;
  }
  const shape = new StatementOperandShape(template);
  shape.Kind = number
    ? StatementOperandShape.KindNumber
    : StatementOperandShape.KindIdentifier;
  shape.Text = text;
  shape.Raw = unit;
  return shape;
}
return null;
```

## method InsertionPoint:()=>Array<Token>

后缀构造（成员 / 调用 / 索引）要把新节点插到**当前表达式**的位置：`parent.Data` 里换掉那个子单元，子单元变成新节点的第一个子节点
（`ShapeInsertUtil.InsertBetween`）。当前表达式就是 `Top()` 的最后一个子单元。

**为什么要穿过前缀节点**：`-a.b` 在 legacy 里是 `-(a.b)`（`ParseUnary` 先递归到 `ParsePostfix`，后缀比前缀绑得紧）。
形状层的前缀节点是**先建好**再把操作数包进去的，所以读到 `.` 时栈顶最后一个子单元还可能是 `KindPrefix`；
这时要往里走一格，把成员插在操作数上，前缀才会包住整条后缀链。

返回 `[父单元, 子单元]`；没有子单元时返回空数组（调用方据此 `Fail`，不建错树）。

```ts
const none:Array<Token> = [];
let parent = this.Top();
if (parent.Data.length === 0) {
  return none;
}
let child = parent.Data[parent.Data.length - 1];
while (true) {
  if (!(child instanceof StatementOperandShape)) {
    break;
  }
  const kind = (child as StatementOperandShape).Kind;
  if (kind !== StatementOperandShape.KindPrefix
    && kind !== StatementOperandShape.KindAwait
    && kind !== StatementOperandShape.KindYield
    && !(kind === StatementOperandShape.KindNew && (child as StatementOperandShape).Open)) {
    break;
  }
  if (child.Data.length === 0) {
    break;
  }
  parent = child;
  child = child.Data[child.Data.length - 1];
}
const point:Array<Token> = [];
point.push(parent);
point.push(child);
return point;
```

## method StartMember:(unit:Token, template:Template)=>void

`a.b` 的 `.`：立刻建成员节点、插到当前表达式的位置（对象原地成为它的第一个子单元），然后转 `ExpectName` 等名字。

```ts
const point = this.InsertionPoint();
if (point.length !== 2) {
  this.Fail("成员访问缺少对象");
  return;
}
if (StatementOperatorBody.IsBareImport(point[1])) {
  this.Fail("import 开头的成员访问");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindMember;
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(point[0], point[1], shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.AwaitName = shape;
this.Expect = StatementOperatorBody.ExpectName;
```

## method IngestName:(unit:Token, text:string, template:Template)=>void

成员名：必须是 `Common` 标识符——关键字 / 数字 / 大整数 / 字面量都不行（`a.1` 不是成员访问）。
建成 `KindIdentifier` 叶子挂进等待的成员节点，回到 `ExpectOperator`。

```ts
const awaitName = this.AwaitName;
if (awaitName === null) {
  this.Fail("没有等待成员名的节点");
  return;
}
const pendingPrivate = this.AwaitPrivate;
if (pendingPrivate !== null) {
  // Stage 5d-7：`#` 之后的那个名字。两格合成 `KindPrivateName` 挂进成员节点。
  if (!(unit instanceof Common)) {
    this.Fail("私有名不是标识符");
    return;
  }
  const privateCommon = unit as Common;
  if (privateCommon.IsNumber() || privateCommon.IsBigInt()) {
    this.Fail("私有名不是标识符");
    return;
  }
  const leaf = new StatementOperandShape(template);
  leaf.Kind = StatementOperandShape.KindIdentifier;
  leaf.Text = text;
  leaf.Raw = unit;
  pendingPrivate.Add(leaf);
  this.AwaitPrivate = null;
  awaitName.Add(pendingPrivate);
  this.AwaitName = null;
  this.Expect = StatementOperatorBody.ExpectOperator;
  return;
}
if (unit instanceof Symbol && (unit as Symbol).Is("#")) {
  // Stage 5d-7：`this.#x` / `obj.#x` 的 `#`：建一个待名字的私有名节点，名字下一格到。
  const privateShape = new StatementOperandShape(template);
  privateShape.Kind = StatementOperandShape.KindPrivateName;
  privateShape.Raw = unit;
  this.AwaitPrivate = privateShape;
  return;
}
if (!(unit instanceof Common)) {
  this.Fail("成员名不是标识符");
  return;
}
const common = unit as Common;
if (common.IsNumber() || common.IsBigInt()) {
  // Stage 5d-7：成员名只排除**数字字面量**（`a.1` 不是成员访问）。`as` / `satisfies` / `true` / `null`
  // 这些关键字在 TS 里是合法的属性名（`obj.as` / `obj.true`），legacy `ParseName` 也照收，
  // 所以这里不再用 `IsOperandText`（那是「能不能当表达式操作数」的判据，不是「能不能当名字」的判据）。
  this.Fail("成员名 " + text);
  return;
}
const name = new StatementOperandShape(template);
name.Kind = StatementOperandShape.KindIdentifier;
name.Text = text;
name.Raw = unit;
awaitName.Add(name);
this.AwaitName = null;
if (this.AwaitMeta) {
  // Stage 5d-7：`new.target` 的名字到了——这一格是**操作数**（MetaProperty），不是 `new` 的被构造者。
  this.AwaitMeta = false;
  this.AttachOperand(awaitName);
  this.Expect = StatementOperatorBody.ExpectOperator;
  return;
}
this.Expect = StatementOperatorBody.ExpectOperator;
```

## method StartCall:(bracket:Bracket, template:Template)=>void

`f(x)`：调用节点插到被调用者的位置；实参不进形状树（AST 侧用 `ParseBracketArguments` 整段建）。

```ts
const point = this.InsertionPoint();
if (point.length !== 2) {
  this.Fail("调用缺少被调用者");
  return;
}
if (StatementOperatorBody.IsBareImport(point[1])) {
  this.Fail("import 开头的调用");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindCall;
shape.Raw = bracket;
ShapeInsertUtil.InsertBetween(point[0], point[1], shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Expect = StatementOperatorBody.ExpectOperator;
```

## method StartIndex:(bracket:Bracket, template:Template)=>void

`a[b]`：下标走**嵌套体**（`bracket.Data` 整段，与圆括号同一套）。**先建内层再插节点**：
内层没接全就直接 `Fail`，不在树上留下半条链。

```ts
if (bracket.Data.length === 0) {
  this.Fail("索引里没有表达式");
  return;
}
const inner = new StatementOperatorBody(template);
inner.Nested = true;
inner.IngestAll(bracket.Data, template);
if (inner.Incomplete || !inner.IsComplete()) {
  this.Fail("索引里的表达式");
  return;
}
if (inner.Root === null || inner.Root.Data.length !== 1) {
  this.Fail("索引里的表达式不是单节点");
  return;
}
const point = this.InsertionPoint();
if (point.length !== 2) {
  this.Fail("索引缺少对象");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindIndex;
shape.Raw = bracket;
ShapeInsertUtil.InsertBetween(point[0], point[1], shape);
shape.Add(inner.Root.Data[0]);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Expect = StatementOperatorBody.ExpectOperator;
```

## method AttachOperand:(built:Token)=>void

操作数到达：先把还挂着的前缀节点按后进先出包上去，再挂进 `Top()`；若父是正在等右操作数的二元节点，就把它标成完整。

```ts
let shape = built;
while (this.Prefixes.length > 0) {
  const prefix = this.Prefixes.pop()!;
  prefix.Add(shape);
  if (prefix instanceof StatementOperandShape && (prefix as StatementOperandShape).Kind === StatementOperandShape.KindNew) {
    (prefix as StatementOperandShape).Open = true;
  }
  shape = prefix;
}
this.Top().Add(shape);
if (this.Frames.length > 0) {
  this.FramePending[this.Frames.length - 1] = false;
}
```

## method PushBinary:(unit:Token, text:string, template:Template)=>void

二元运算符：优先级取自 `OperatorTable.Precedence`，结合性取自 `OperatorTable.AssociationOf`（唯一来源），
其余交给 `PushOperator`。`**` 右结合、其余左结合，与 `ParseBinary` 同口径。

```ts
this.PushOperator(unit, text, OperatorTable.Precedence(text), OperatorTable.AssociationOf(text) === "right", template);
```

## method PushAssignment:(unit:Token, text:string, template:Template)=>void

赋值 / 复合赋值（S3h）：**优先级固定取 `OperatorTable.AssignmentPrecedence`（0，比一切二元都低）、右结合**。
右结合意味着连续赋值 `a = b = 1` 不弹栈，第二个 `=` 直接成为第一个 `=` 的右支（`=(a,=(b,1))`）；
左结合会建出 `=(=(a,b),1)`，与 legacy `ParseAssign` 的递归不一致。

```ts
this.PushOperator(unit, text, OperatorTable.AssignmentPrecedence, true, template);
```

## method PushOperator:(unit:Token, text:string, precedence:int, rightAssoc:bool, template:Template)=>void

遇运算符**立刻**建节点：先按优先级/结合性弹掉已经完整的栈顶（左结合收敛），
再用 `ShapeInsertUtil.InsertBetween` 把新节点插进「父单元与最后一个子单元」之间——**这一步就是 S3b 的增量插入**，
左操作数原地变成新节点的子单元。最后压栈、转「等操作数」。

弹栈的条件与 `FeasOperatorParser` 的整段版**同一口径**：栈顶完整且（栈顶优先级 > 当前，或等于且非右结合）。
二元与赋值共用本方法，差别只在调用方给出的两个数。

**条件帧永不在这里被弹掉**（S3h 的坑）：条件表达式的假分支在文法里是一个 `ParseAssign`，所以
`a ? b : c = d` 里那个 `=` 属于假分支（legacy 建 `?(a,b,=(c,d))`），而不是把整个条件当左操作数
（那会建出非法的 `=(?(a,b,c),d)`，`ast-json` 的 expression 夹具会因此变化）。条件帧的优先级是 1，
只有赋值（优先级 0）才满足「栈顶 > 当前」把它弹掉，所以这里对 `CondPrecedence` 显式封一格。

```ts
while (this.Frames.length > 0 && !this.FramePending[this.Frames.length - 1]
  && this.FramePrecs[this.FramePrecs.length - 1] !== StatementOperatorBody.CondPrecedence
  && (this.FramePrecs[this.FramePrecs.length - 1] > precedence
    || (this.FramePrecs[this.FramePrecs.length - 1] === precedence && !rightAssoc))) {
  this.CompleteTop();
}
const parent = this.Top();
if (parent.Data.length === 0) {
  this.Fail("缺少左操作数（" + text + "）");
  return;
}
const child = parent.Data[parent.Data.length - 1];
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindOperator;
shape.Text = text;
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(parent, child, shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Frames.push(shape);
this.FramePrecs.push(precedence);
this.FramePending.push(true);
this.Expect = StatementOperatorBody.ExpectOperand;
```

## method StartConditional:(unit:Token, template:Template)=>void

`a ? b : c` 的 `?`（S3h）：先弹掉所有**完整的二元帧**（条件是整条二元表达式），再建一个
`KindConditional` 帧压在剩下的栈顶上（赋值帧 / 外层条件帧因此成为它的父），`Data` 先只有条件。

`ExpectOperand` 之后的操作数由 `AttachOperand` 挂进 `Top()`——那就是本节点，于是它成为真分支；
`Expect` 转回 `ExpectOperator` 后遇到 `:` 由 `CloseConditional` 收真分支、等假分支。

栈顶若还在等右操作数（`a + ? b : c`）则判非法，**不建错树**。

```ts
while (this.Frames.length > 0 && !this.FramePending[this.Frames.length - 1]
  && this.FramePrecs[this.FramePrecs.length - 1] > StatementOperatorBody.CondPrecedence) {
  this.CompleteTop();
}
if (this.Frames.length > 0 && this.FramePending[this.FramePending.length - 1]) {
  this.Fail("条件表达式缺少条件");
  return;
}
const parent = this.Top();
if (parent.Data.length === 0) {
  this.Fail("条件表达式缺少条件");
  return;
}
const child = parent.Data[parent.Data.length - 1];
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindConditional;
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(parent, child, shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Frames.push(shape);
this.FramePrecs.push(StatementOperatorBody.CondPrecedence);
this.FramePending.push(true);
this.Conditionals.push(shape);
this.Expect = StatementOperatorBody.ExpectOperand;
```

## method CloseConditional:(unit:Token)=>void

`:`（S3h）：真分支已经挂在最内层等待中的条件节点上。先弹掉它上面所有**已完整**的帧
（`a ? b + c : d` 的 `+` 帧在下面、`a ? b : c ? d : e` 的内层条件已完整），直到栈顶正是
`Conditionals` 的栈顶；记下冒号单元、把该帧重新标成「等右操作数」，让假分支挂进同一个节点。

栈顶还在等操作数（`a ? b + : c`）或根本没有等待中的条件（裸 `:`）则判非法。

```ts
while (this.Frames.length > 0 && (this.Conditionals.length === 0
  || this.Frames[this.Frames.length - 1] !== this.Conditionals[this.Conditionals.length - 1])) {
  if (this.FramePending[this.FramePending.length - 1]) {
    this.Fail("条件表达式缺少分支");
    return;
  }
  this.CompleteTop();
}
if (this.Conditionals.length === 0 || this.Frames.length === 0) {
  this.Fail("冒号没有对应的条件表达式");
  return;
}
if (this.FramePending[this.FramePending.length - 1]) {
  this.Fail("条件表达式缺少真分支");
  return;
}
const target = this.Conditionals[this.Conditionals.length - 1];
(target as StatementOperandShape).Colon = unit;
this.Conditionals.pop();
this.FramePending[this.FramePending.length - 1] = true;
this.Expect = StatementOperatorBody.ExpectOperand;
```

## method StartPostfix:(unit:Token, text:string, template:Template)=>void

后缀 `++` / `--`（S3h）：与成员访问同一条插入路径（`InsertionPoint` 会穿过前缀节点，所以 `-a++` 是 `-(post(a))`），
插完仍在 `ExpectOperator`——后缀运算的结果还是操作数。

```ts
const point = this.InsertionPoint();
if (point.length !== 2) {
  this.Fail("后缀自增自减缺少操作数");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindPostfix;
shape.Text = text;
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(point[0], point[1], shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Expect = StatementOperatorBody.ExpectOperator;
```

## method CompleteTop:()=>void

弹掉一个已经完整的栈顶二元节点（它的 `Data` 里左右操作数都在，引用仍挂在父单元里，只是不再参与优先级比较）。

```ts
this.Frames.pop();
this.FramePrecs.pop();
this.FramePending.pop();
```

## method StartNew:(unit:Token, template:Template)=>void

`new` 关键字（S3g）：压一个 `KindNew` 前缀节点，等被构造者。与 `-a` 的前缀走同一个 `Prefixes` 栈，
所以 `-new X()` 的包裹顺序自然正确（`-` 包 `new`，而不是反过来）。

```ts
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindNew;
shape.Raw = unit;
this.Prefixes.push(shape);
```

## method StartNewTarget:(unit:Token, template:Template)=>bool

`new.target`（Stage 5d-7）：`new` 之后紧跟 `.`、而 `new` 还没等到被构造者时，这一格不是成员访问
（legacy `ParseNew` 在 `new` 之后专门判 `. target`），而是 `MetaProperty`。

**为什么在这里判而不是在收口器里判**：`new .` 那一格到达时本体还停在 `ExpectOperand`，
按普通规则会 `BuildOperand(".")` → `Fail`（`new.target` 于是永远回 legacy）。所以这一格必须由状态机接住：
把 `new` 前缀节点改写成 `KindNewTarget`（不再是前缀，去掉 `Prefixes` 里的那一格），
转 `ExpectName` 等 `target`，`AwaitMeta` 告诉 `IngestName` 名字到达后把它当**操作数**挂进当前帧。

条件不成立（`new` 已经有被构造者，或 `new` 不是栈顶前缀）时返回 `false`，让普通成员访问路径照旧处理——
判据只认「栈顶前缀正是还没挂操作数的 `KindNew`」这一种形态。

```ts
if (this.Prefixes.length === 0) {
  return false;
}
const top = this.Prefixes[this.Prefixes.length - 1];
if (!(top instanceof StatementOperandShape)) {
  return false;
}
const shape = top as StatementOperandShape;
if (shape.Kind !== StatementOperandShape.KindNew || shape.Data.length !== 0) {
  return false;
}
this.Prefixes.pop();
shape.Kind = StatementOperandShape.KindNewTarget;
shape.Args = unit;
this.AwaitName = shape;
this.AwaitMeta = true;
this.Expect = StatementOperatorBody.ExpectName;
return true;
```

## method AcceptNewArgs:(bracket:Bracket)=>bool
`new X(...)` 的实参括号（S3g）：当前表达式最外层若是还开着的 `KindNew`，这一对圆括号属于它，
不是对构造结果的调用。记下括号、关掉后缀链并返回 `true`；否则返回 `false` 交给 `StartCall`。

**只在 `Top()` 的最后一个子单元上找**：`a + new X(` 的 `Top()` 是待右操作数的 `+` 帧，它的最后一个子单元
正是 `new` 节点；找不到就说明括号属于别的调用（`new X()()` 的第二个括号），交给 `StartCall` 是对的。

```ts
const top = this.Top();
if (top.Data.length === 0) {
  return false;
}
const last = top.Data[top.Data.length - 1];
if (!(last instanceof StatementOperandShape)) {
  return false;
}
const shape = last as StatementOperandShape;
if (shape.Kind !== StatementOperandShape.KindNew || !shape.Open || shape.Args !== null) {
  return false;
}
shape.Args = bracket;
shape.Open = false;
this.Expect = StatementOperatorBody.ExpectOperator;
return true;
```

## method StartAwaitYield:(unit:Token, text:string, template:Template)=>void

`await` / `yield` 出现在**操作数位**时（Stage 5d-8b）：压成一个前缀节点（`KindAwait` / `KindYield`），
操作数到了由 `AttachOperand` 包上去（`yield yield 2` 因此自然嵌套成 `yield(yield(2))`）。

**「有没有操作数」不在喂单元时判**：壳是**逐格**喂单元的，读到 `yield` 那一格时后面的 `y` 还不存在
（`x = yield y` 会先看到 `[x, =, yield]`），这时判「没有操作数」会把 `y` 挤到语句外。所以这一格统一当
前缀压栈，收口时由 `Finish` 的 `AttachDanglingAwaitYield` 决定：那时 `Units` 是整条语句的全部单元，
还挂着的就是真的没有操作数（`x = yield` / `f(yield)`）。

**判型（AwaitExpression / YieldExpression / 普通 Identifier）仍然只在 legacy**：见 `KindAwait` / `KindYield`，
收口器把关键字那一格交给 `ExpressionBuilder.ParseUnary`，再核消费长度是否与本形状节点声明的区间一致。

```ts
const shape = new StatementOperandShape(template);
shape.Kind = text === "yield" ? StatementOperandShape.KindYield : StatementOperandShape.KindAwait;
shape.Raw = unit;
shape.Text = text;
this.Prefixes.push(shape);
```

## method AttachDanglingAwaitYield:()=>bool

收口前的最后一步：栈顶前缀如果正是还没挂操作数的 `KindYield` / `KindAwait`，它**自己就是操作数**
（`x = yield` / `f(yield)` / `yield;`），把它挂进当前帧。返回是否挂了一格。

只处理这两种 Kind：其它还挂着的前缀（`a = -`）仍然按「不完整」处理（`Expect` 留在 `ExpectOperand`），
`IsComplete()` 为假、整条回 legacy——保守方向不变。

```ts
if (this.Prefixes.length === 0) {
  return false;
}
const pending = this.Prefixes[this.Prefixes.length - 1];
if (!(pending instanceof StatementOperandShape)) {
  return false;
}
const kind = (pending as StatementOperandShape).Kind;
if (kind !== StatementOperandShape.KindAwait && kind !== StatementOperandShape.KindYield) {
  return false;
}
this.Prefixes.pop();
this.AttachOperand(pending);
this.Expect = StatementOperatorBody.ExpectOperator;
return true;
```

## method NextCodeUnit:()=>Token | null

从当前摄入位置往后看**下一个代码单元**（跳过 trivia）：`Ingest` 进来时 `Ingested` 已经指向本单元之后，
所以这里读到的是「还没喂进来的第一格」。看不到就返回 `null`（本条语句到此为止）。

只读 `Units`，不改任何状态（`ParenFeedsArrow` 那类前瞻同一性质：判据只回答「后面是什么」，不建节点）。

```ts
for (let index = this.Ingested; index < this.Units.length; index++) {
  if (this.Units[index].IsTriviaToken) {
    continue;
  }
  return this.Units[index];
}
return null;
```

## method AwaitNewCallee:()=>bool

栈顶前缀是不是**还没挂子节点**的 `KindNew`（`new` 刚读到、被构造者还没来）。`new { … }` 用它把 `{`
从「块体边界」翻成「对象字面量操作数」——只认这一种形态，别处顶层 `{` 仍然不解释。

```ts
if (this.Prefixes.length === 0) {
  return false;
}
const top = this.Prefixes[this.Prefixes.length - 1];
if (!(top instanceof StatementOperandShape)) {
  return false;
}
const shape = top as StatementOperandShape;
return shape.Kind === StatementOperandShape.KindNew && shape.Data.length === 0;
```

## method StartsNextStatement:(unit:Token)=>bool

`ExpectOperator` 位上、**换行之后**出现一个「新语句的起点」时，表达式到此为止（Stage 5d-8b）。

判据两条，方向都保守（判成「新语句」只是提前收口；壳的判界若不同意，`Covers` 会判否、整条回 legacy，
不会建错树）：

1. 这一格与**前一个代码单元**之间有换行（`LineTerminator.HasBetween`，与判界层同一份行终止符口径）；
2. 这一格是**续不上表达式**的语句起点：语句关键字（`function` / `class` / `const` / `let` / `var` /
   `if` / `for` / `while` / `do` / `return` / `throw` / `new` / `void` / `delete` / `typeof` /
   `this` / `true` / `false` / `null` / `super` / `import` / `export` / `declare` / `debugger` …）或一个 `{`。

`as` / `satisfies` / `instanceof` / `in` 这些**能**续接的关键字不在集合里；`.` `,` `(` `[` 模板串等
本来就由各自的分支接住，也不需要在这里判。

```ts
let previous = this.Ingested - 2;
while (previous >= 0 && this.Units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
if (LineTerminator.HasBetween(this.Units[previous].SourceRange, unit.SourceRange)) {
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    return true;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (StatementOperatorBody.IsStatementStartKeyword(text)) {
      return true;
    }
  }
}
return false;
```

## static method IsStatementStartKeyword:(text:string)=>bool

能开始一条语句、但**绝不能续接一个表达式**的关键字（`IsStatementStartKeyword` 的集合刻意保守：
`await` / `yield` 不在这里——它们由操作数位的 `StartAwaitYield` 判；`as` / `satisfies` / `instanceof` / `in`
是续接运算符，也不在）。

```ts
return text === "function" || text === "class" || text === "const" || text === "let" || text === "var"
  || text === "if" || text === "for" || text === "while" || text === "do" || text === "return"
  || text === "throw" || text === "try" || text === "switch" || text === "case" || text === "default"
  || text === "break" || text === "continue" || text === "new" || text === "this" || text === "true"
  || text === "false" || text === "null" || text === "super" || text === "import" || text === "export"
  || text === "declare" || text === "debugger" || text === "with" || text === "enum"
  || text === "interface" || text === "namespace" || text === "type" || text === "abstract"
  || text === "void" || text === "delete" || text === "typeof" || text === "else"
  || text === "catch" || text === "finally";
```

## method StartQuestionDot:(unit:Token, template:Template)=>void
`a?.` 的可选链（S3g）：先把一个待定节点插到对象的位置（与 `StartMember` 同一处、同一套 `InsertBetween`），
转 `ExpectOptional` 等下一个单元决定它是成员名 / 调用还是索引。

```ts
const point = this.InsertionPoint();
if (point.length !== 2) {
  this.Fail("可选链缺少对象");
  return;
}
if (StatementOperatorBody.IsBareImport(point[1])) {
  this.Fail("import 开头的可选链");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindQuestionDot;
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(point[0], point[1], shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.AwaitOptional = shape;
this.Expect = StatementOperatorBody.ExpectOptional;
```

## method IngestOptional:(unit:Token, text:string, template:Template)=>void

`?.` 之后的那个单元（S3g）：`(` → 可选调用、`[` → 可选索引、标识符 → 可选成员。三种都复用既有 AST 形状
（`PropertyAccessExpressionShape` / `CallExpressionShape` / `ElementAccessExpressionShape`），差别只是
`?.` 这个单元会作为子节点投影进 AST（`StatementShapeAst` 用 `MakeOperatorToken` 建 `QuestionDotTokenShape`）。

```ts
if (this.AwaitOptional === null) {
  this.Fail("没有等待的可选链节点");
  return;
}
const shape = this.AwaitOptional as StatementOperandShape;
this.AwaitOptional = null;
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(") {
  shape.Kind = StatementOperandShape.KindOptionalCall;
  shape.Args = unit;
  this.Expect = StatementOperatorBody.ExpectOperator;
  return;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
  const bracket = unit as Bracket;
  if (bracket.Data.length === 0) {
    this.Fail("可选索引里没有表达式");
    return;
  }
  const inner = new StatementOperatorBody(template);
  inner.Nested = true;
  inner.IngestAll(bracket.Data, template);
  if (inner.Incomplete || !inner.IsComplete()) {
    this.Fail("可选索引里的表达式");
    return;
  }
  if (inner.Root === null || inner.Root.Data.length !== 1) {
    this.Fail("可选索引里的表达式不是单节点");
    return;
  }
  shape.Kind = StatementOperandShape.KindOptionalIndex;
  shape.Args = bracket;
  shape.Add(inner.Root.Data[0]);
  this.Expect = StatementOperatorBody.ExpectOperator;
  return;
}
if (!(unit instanceof Common)) {
  this.Fail("?. 之后不是成员名 / 调用 / 索引");
  return;
}
const common = unit as Common;
if (!StatementOperatorBody.IsOperandText(text) || common.IsNumber() || common.IsBigInt()) {
  this.Fail("可选链成员名 " + text);
  return;
}
shape.Kind = StatementOperandShape.KindOptionalMember;
const name = new StatementOperandShape(template);
name.Kind = StatementOperandShape.KindIdentifier;
name.Text = text;
name.Raw = unit;
shape.Add(name);
this.Expect = StatementOperatorBody.ExpectOperator;
```

## method Fail:(reason:string)=>void

未实现的构造：记原因、停摄入、计数，并**撤回本体的槽位**（否则半棵树会冒充结构证明）。
**不抛错**——壳本身还要照旧把语句交给建造器，XML 才能与 legacy 逐字节一致。

```ts
if (!this.Incomplete) {
  StatementOperatorBody.TotalIncomplete++;
  if (this.Slot >= 0 && this.Slot === StatementOperatorBody.ShapeTexts.length - 1) {
    StatementOperatorBody.ShapeTexts.pop();
    this.Slot = -1;
  }
}
this.Incomplete = true;
this.Reason = reason;
```

## method ResetState:()=>void

把状态机还原到「刚建出来」的样子（Stage 5d-7 的类型实参尾巴重放用）：`Root` / 帧栈 / 前缀栈 /
条件栈 / 各种「等什么」的标记 / `Ingested` / `Closed` / `Incomplete` / `Inserts` 全部清空。

**只清「摄入过程写过的」字段**：`Units` / `Template` / `Nested` / `Counted` / `Slot` 不动——
`Slot` 是本体在 `ShapeTexts` 里的槽位，重放后发布的是同一个槽位（原来的半棵树因此被覆盖，不是新占一格）。

```ts
this.Root = null;
this.Frames = [];
this.FramePrecs = [];
this.FramePending = [];
this.AwaitName = null;
this.AwaitOptional = null;
this.AwaitBody = null;
this.AwaitMeta = false;
this.Prefixes = [];
this.ArrowBodyUnits = 0;
this.TypeTailUnits = 0;
this.TypeTailAngle = 0;
this.TypeTailQuestion = false;
this.Conditionals = [];
this.Expect = StatementOperatorBody.ExpectOperand;
this.Ingested = 0;
this.Closed = false;
this.Incomplete = false;
this.Reason = "";
this.Inserts = 0;
this.SawLessThan = false;
this.PreviousUnit = null;
```

## method ReplayUntil:(limit:int, template:Template)=>bool

重放 `Units[0..limit-1]`（不含 trivia 的单元照普通规则喂）：返回「重放完正好停在操作符位置」。
中途再失败 / 判成语句边界（`Closed`）就返回 `false`——调用方据此放弃接管（保持 `Incomplete`）。

只从 `Ingested` 往后走，`IngestAll` 那套「逐格 + 停条件」在这里显式写一遍，因为它有**上界**。

```ts
while (this.Ingested < limit && !this.Incomplete && !this.Closed) {
  const at = this.Ingested;
  this.Ingested = at + 1;
  if (this.Units[at].IsTriviaToken) {
    continue;
  }
  this.Ingest(this.Units[at], template);
}
if (this.Incomplete || this.Closed) {
  return false;
}
return this.Expect === StatementOperatorBody.ExpectOperator;
```

## method TryTypeArgumentTail:(template:Template)=>bool

把「`<` 是类型实参表开头」这一种解释落到本体上（Stage 5d-7）：找第一个判成类型实参的 `<`，
重放它**之前**的单元，再把整段前缀表达式包成 `KindTypeArguments`，停在 `Closed`（后面的单元交给收口器）。

**为什么不逐格判**：`AmbiguousTypeArguments` / `AngleJudge.CanStart` 都要看 `<` 的配对 `>` 与它之后的
follower，而壳是逐格喂单元的——读到 `<` 那一格后面还没有单元。所以判据放在 `IngestAll` 收尾、
`Units` 已经是全部单元之后；这也意味着此时前缀可能已经被 `<` / `?.` 弄脏，只能**重放**。

**排除 `new X<T>()`**：那里的类型实参属于 `NewExpression`（legacy 在 `ParseNew` 里建），
`ParsePostfixSuffix` 会把它建成一个对 `new` 结果的调用，树不同形。所以前缀若是还开着的 `KindNew`，这里判否。

**计数口径**：重放前本体可能已经 `Fail` 过（`TotalIncomplete` 已 +1）；重放成功就是「那一次失败被撤销」，
这里把计数减回去，保持 `TotalIncomplete` = 「最终仍未接住的体数」。

```ts
const units = this.Units;
// 判据看的是**代码单元**：`AngleJudge.FollowerAllows` 取配对 `>` 之后的**那一格**，而本体的 `Units`
// 是壳的 raw 单元、里面夹着 `WrapSymbol`（空白块，`IsTriviaToken`）。`a<b> as T` / `g<number> /* c */ (1)`
// 的 follower 因此会读到空白而不是 `as` / `(`，同一个判据白白判否（TS 对空白不敏感：
// `f < g > (a)` 就是泛型调用）。这里先滤出代码单元、用**同一下标映射**把结论折回原单元下标；
// `AngleJudge` 本身一个字没改（它原本就是给 `ExpressionBuilder.Units` 用的，那份本来不含 trivia）。
const code:Array<Token> = [];
const codeIndexes:Array<number> = [];
for (let index = 0; index < units.length; index++) {
  if (units[index].IsTriviaToken) {
    continue;
  }
  code.push(units[index]);
  codeIndexes.push(index);
}
let codeLessThan = -1;
for (let index = 0; index < code.length; index++) {
  const unit = code[index];
  if (!(unit instanceof Symbol) || !(unit as Symbol).Is("<")) {
    continue;
  }
  if (AngleJudge.CanStart(code, index)) {
    codeLessThan = index;
    break;
  }
}
if (codeLessThan <= 0) {
  return false;
}
const ltIndex = codeIndexes[codeLessThan];
// `a?.<T>(b)`：`<` 紧跟在 `?.` 之后。那时 `<` 属于**可选调用**的类型实参段（legacy 在
// `ParsePostfixSuffix` 的 `?.` 分支里建），不是 `<` 这一格自己开的——所以尾巴要从 `?.` 那一格起，
// 前缀重放到 `?.` 之前（重放后 `Expect` 才会是 `ExpectOperator`）。
let tailIndex = ltIndex;
const beforeLessThan = code[codeLessThan - 1];
if (beforeLessThan instanceof Symbol && (beforeLessThan as Symbol).Is("?.")) {
  tailIndex = codeIndexes[codeLessThan - 1];
}
const wasIncomplete = this.Incomplete;
this.ResetState();
if (!this.ReplayUntil(tailIndex, template)) {
  // 重放不了：把「已经失败过」这件事恢复回去（调用方会再 Fail 一次或保持原状）。
  if (!wasIncomplete) {
    this.Incomplete = false;
  }
  return false;
}
const point = this.InsertionPoint();
if (point.length !== 2) {
  return false;
}
const child = point[1];
if (child instanceof StatementOperandShape) {
  const shape = child as StatementOperandShape;
  if (shape.Kind === StatementOperandShape.KindNew && shape.Open && shape.Args === null) {
    return false;
  }
}
const np = new StatementOperandShape(template);
np.Kind = StatementOperandShape.KindTypeArguments;
np.Raw = units[tailIndex];
ShapeInsertUtil.InsertBetween(point[0], point[1], np);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Closed = true;
if (wasIncomplete && StatementOperatorBody.TotalIncomplete > 0) {
  StatementOperatorBody.TotalIncomplete--;
}
return true;
```

## method Text:()=>string

本体的结构文本（`+(*(1,2),3)` 这种前缀写法），只在 `Root` 有子单元时非空。

```ts
if (this.Root === null || this.Root.Data.length === 0) {
  return "";
}
return StatementOperatorBody.Render(this.Root.Data[0]);
```

## static method Render:(token:Token)=>string

把已建的形状树渲染成前缀文本——结构判据就靠它，而不是再读一遍源码。
二元节点写成 `op(左,右)`、前缀写成 `op(操作数)`、括号写成 `(…中缀…)`。

```ts
if (token instanceof StatementOperandShape) {
  const shape = token as StatementOperandShape;
  if (shape.Kind === StatementOperandShape.KindOperator) {
    const left = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    const right = shape.Data.length > 1 ? StatementOperatorBody.Render(shape.Data[1]) : "?";
    return shape.Text + "(" + left + "," + right + ")";
  }
  if (shape.Kind === StatementOperandShape.KindConditional) {
    const condition = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    const whenTrue = shape.Data.length > 1 ? StatementOperatorBody.Render(shape.Data[1]) : "?";
    const whenFalse = shape.Data.length > 2 ? StatementOperatorBody.Render(shape.Data[2]) : "?";
    return "?(" + condition + "," + whenTrue + "," + whenFalse + ")";
  }
  if (shape.Kind === StatementOperandShape.KindNonNull) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "nonnull(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindTaggedTemplate) {
    const tag = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "tagged(" + tag + ",template)";
  }
  if (shape.Kind === StatementOperandShape.KindTypeAssert) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return shape.Text + "(" + only + ",type)";
  }
  if (shape.Kind === StatementOperandShape.KindTypeArguments) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "typeArgs(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindPrivateName) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "private(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindPostfix) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "post(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindPrefix) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return shape.Text + "(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindAwait || shape.Kind === StatementOperandShape.KindYield) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "";
    return shape.Text + "(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindParen) {
    if (shape.Data.length === 0) {
      return "params";
    }
    const only = StatementOperatorBody.RenderInfix(shape.Data[0]);
    return "(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindMember) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    const name = shape.Data.length > 1 ? StatementOperatorBody.Render(shape.Data[1]) : "?";
    return "member(" + object + "," + name + ")";
  }
  if (shape.Kind === StatementOperandShape.KindCall) {
    const callee = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "call(" + callee + ")";
  }
  if (shape.Kind === StatementOperandShape.KindIndex) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    const subscript = shape.Data.length > 1 ? StatementOperatorBody.Render(shape.Data[1]) : "?";
    return "index(" + object + "," + subscript + ")";
  }
  if (shape.Kind === StatementOperandShape.KindObject) {
    return "object";
  }
  if (shape.Kind === StatementOperandShape.KindArrow) {
    const parameter = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "arrow(" + parameter + ")";
  }
  if (shape.Kind === StatementOperandShape.KindFunction) {
    return "function";
  }
  if (shape.Kind === StatementOperandShape.KindClass) {
    return "class";
  }
  if (shape.Kind === StatementOperandShape.KindNew) {
    const callee = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "new(" + callee + ")";
  }
  if (shape.Kind === StatementOperandShape.KindOptionalMember) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    const name = shape.Data.length > 1 ? StatementOperatorBody.Render(shape.Data[1]) : "?";
    return "member(" + object + "," + name + ")";
  }
  if (shape.Kind === StatementOperandShape.KindOptionalCall) {
    const callee = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "call(" + callee + ")";
  }
  if (shape.Kind === StatementOperandShape.KindOptionalIndex) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    const subscript = shape.Data.length > 1 ? StatementOperatorBody.Render(shape.Data[1]) : "?";
    return "index(" + object + "," + subscript + ")";
  }
  if (shape.Kind === StatementOperandShape.KindQuestionDot) {
    return "qdot";
  }
  if (shape.Kind === StatementOperandShape.KindString) {
    return "string";
  }
  if (shape.Kind === StatementOperandShape.KindTemplate) {
    return "template";
  }
  if (shape.Kind === StatementOperandShape.KindRegex) {
    return "regex";
  }
  if (shape.Kind === StatementOperandShape.KindArray) {
    return "array";
  }
  return shape.Text;
}
return "?";
```

## static method RenderInfix:(token:Token)=>string

括号内部用**中缀**写法（`b+c`）：括号的意义就是把一段中缀运算整体当成一个操作数，
所以 `a*(b+c)` 的结构文本是 `*(a,(b+c))`，不是 `*(a,(+(b,c)))`。

```ts
if (token instanceof StatementOperandShape) {
  const shape = token as StatementOperandShape;
  if (shape.Kind === StatementOperandShape.KindOperator) {
    const left = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    const right = shape.Data.length > 1 ? StatementOperatorBody.RenderInfix(shape.Data[1]) : "?";
    return left + shape.Text + right;
  }
  if (shape.Kind === StatementOperandShape.KindConditional) {
    const condition = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    const whenTrue = shape.Data.length > 1 ? StatementOperatorBody.RenderInfix(shape.Data[1]) : "?";
    const whenFalse = shape.Data.length > 2 ? StatementOperatorBody.RenderInfix(shape.Data[2]) : "?";
    return "?(" + condition + "," + whenTrue + "," + whenFalse + ")";
  }
  if (shape.Kind === StatementOperandShape.KindNonNull) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return "nonnull(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindPostfix) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return "post(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindPrefix) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return shape.Text + only;
  }
  if (shape.Kind === StatementOperandShape.KindParen) {
    if (shape.Data.length === 0) {
      return "params";
    }
    const only = StatementOperatorBody.RenderInfix(shape.Data[0]);
    return "(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindMember) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    const name = shape.Data.length > 1 ? StatementOperatorBody.RenderInfix(shape.Data[1]) : "?";
    return "member(" + object + "," + name + ")";
  }
  if (shape.Kind === StatementOperandShape.KindCall) {
    const callee = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return "call(" + callee + ")";
  }
  if (shape.Kind === StatementOperandShape.KindIndex) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    const subscript = shape.Data.length > 1 ? StatementOperatorBody.RenderInfix(shape.Data[1]) : "?";
    return "index(" + object + "," + subscript + ")";
  }
  if (shape.Kind === StatementOperandShape.KindObject) {
    return "object";
  }
  if (shape.Kind === StatementOperandShape.KindArrow) {
    const parameter = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return "arrow(" + parameter + ")";
  }
  if (shape.Kind === StatementOperandShape.KindFunction) {
    return "function";
  }
  if (shape.Kind === StatementOperandShape.KindClass) {
    return "class";
  }
  if (shape.Kind === StatementOperandShape.KindNew) {
    const callee = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return "new(" + callee + ")";
  }
  if (shape.Kind === StatementOperandShape.KindOptionalMember) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    const name = shape.Data.length > 1 ? StatementOperatorBody.RenderInfix(shape.Data[1]) : "?";
    return "member(" + object + "," + name + ")";
  }
  if (shape.Kind === StatementOperandShape.KindOptionalCall) {
    const callee = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return "call(" + callee + ")";
  }
  if (shape.Kind === StatementOperandShape.KindOptionalIndex) {
    const object = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    const subscript = shape.Data.length > 1 ? StatementOperatorBody.RenderInfix(shape.Data[1]) : "?";
    return "index(" + object + "," + subscript + ")";
  }
  if (shape.Kind === StatementOperandShape.KindQuestionDot) {
    return "qdot";
  }
  if (shape.Kind === StatementOperandShape.KindString) {
    return "string";
  }
  if (shape.Kind === StatementOperandShape.KindTemplate) {
    return "template";
  }
  if (shape.Kind === StatementOperandShape.KindRegex) {
    return "regex";
  }
  if (shape.Kind === StatementOperandShape.KindArray) {
    return "array";
  }
  return shape.Text;
}
return "?";
```

## method StartDeclarationOperand:(unit:Token, text:string, kind:int, template:Template)=>void

`function` / `class` 在**操作数位置**（S3l）：建一个不透明节点挂进 `Top()`，转 `ExpectBody` 等函数体 / 类体。

**为什么不像 S3g 那样直接 `Fail("class 表达式")`**：那条守卫挡住的是「不建错树」，代价是 `(class {})` 永远回 legacy。
现在 `<` / `>` / `{` 在头部里被 `ExpectBody` **整格跳过**，不再进 `PushBinary` / `BuildOperand`，
S3g 记录的错树路径（`class` `<` `T` `>` `{object}` 三格拼成「恰好完整」）因此不成立。

```ts
const shape = new StatementOperandShape(template);
shape.Kind = kind;
shape.Text = text;
shape.Raw = unit;
const top = this.Top();
// S3m：`async function …`（表达式位置）——async 先作为标识符操作数进了 Top()，
// `function` 到达时把它摘成函数节点的 Data[0]（不进形状树正文，只给 AST 当 AsyncKeyword）。
if (kind === StatementOperandShape.KindFunction && top.Data.length >= 1) {
  const previous = top.Data[top.Data.length - 1];
  if (previous instanceof StatementOperandShape
    && (previous as StatementOperandShape).Kind === StatementOperandShape.KindIdentifier
    && (previous as StatementOperandShape).Text === "async") {
    top.Data.pop();
    shape.Add(previous);
  }
}
top.Add(shape);
this.AwaitBody = shape;
this.Expect = StatementOperatorBody.ExpectBody;
```

## method IngestBody:(unit:Token)=>void

`function` / `class` 的头部之后（S3l）：第一个 `{` 括号就是函数体 / 类体，收口回到 `ExpectOperator`，
并把父二元帧标成「右操作数已到」（本节点就是那个右操作数）。名字 / 类型参数 / 遗产子句 / 实参括号一律跳过。

**只在 `ExpectBody` 里跳过**：`a + function(){}` 的 `+` 帧仍在等右操作数，`IngestBody` 只吞头部、
不碰 `Frames`，所以优先级收敛与普通操作数完全一致。

```ts
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
  this.AwaitBody = null;
  this.Expect = StatementOperatorBody.ExpectOperator;
  if (this.Frames.length > 0) {
    this.FramePending[this.Frames.length - 1] = false;
  }
}
```

## method StartArrow:(unit:Token, template:Template)=>void

`=>`（S3l）：参数只能是「一个标识符」或「一个圆括号参数表」（含 `()` 与未解析的 `(a, b)` / 解构参数）。
参数已经是当前表达式的最后一个子单元，用 `InsertBetween` 把它原地变成 `KindArrow` 的唯一子节点，
转 `ExpectArrowTail` 吞掉箭头体。

参数形态不认识（`a.b => …`、`async (x) => …` 里的 `call(async)`、前缀包着的 `-x => …`）就 `Fail`：
legacy 的箭头文法只接受这两种参数前缀，形状层多认一种就会建出 legacy 不会建的树。

```ts
const top = this.Top();
if (top.Data.length === 0) {
  this.Fail("箭头函数缺少参数");
  return;
}
const params = top.Data[top.Data.length - 1];
if (!(params instanceof StatementOperandShape)) {
  this.Fail("箭头函数参数不是形状节点");
  return;
}
const paramShape = params as StatementOperandShape;
// S3m：`async (x) => …` 在形状层先被建成 `call(async)`（async 是操作数、括号是实参），
// 到 `=>` 时把这个 call 原地收成**未解析参数表**（与 `(a, b) => …` 同形），async 单元记进参数的 `Raw`——
// AST 侧从 async 那格起调用 legacy `ParseAssign`，与 `async x => …` 同一条路。
let asyncUnit:Token | null = null;
if (paramShape.Kind === StatementOperandShape.KindCall && paramShape.Data.length === 1) {
  const callee = paramShape.Data[0];
  if (callee instanceof StatementOperandShape
    && (callee as StatementOperandShape).Kind === StatementOperandShape.KindIdentifier
    && (callee as StatementOperandShape).Text === "async") {
    asyncUnit = (callee as StatementOperandShape).Raw;
    paramShape.Kind = StatementOperandShape.KindParen;
    paramShape.Data.length = 0;
    paramShape.Raw = null;
  }
}
// S3m：`async x => …` 的 async 与 x 是 Top() 里的两个兄弟；摘掉 async，参数的 `Raw` 指向它，
// 形状树因此只有一个根（不会「表达式体没有唯一的根节点」）。
if (asyncUnit === null && top.Data.length >= 2) {
  const previous = top.Data[top.Data.length - 2];
  if (previous instanceof StatementOperandShape
    && (previous as StatementOperandShape).Kind === StatementOperandShape.KindIdentifier
    && (previous as StatementOperandShape).Text === "async") {
    asyncUnit = (previous as StatementOperandShape).Raw;
    top.Data.splice(top.Data.length - 2, 1);
  }
}
if (asyncUnit !== null) {
  paramShape.Raw = asyncUnit;
}
if (paramShape.Kind !== StatementOperandShape.KindIdentifier
  && paramShape.Kind !== StatementOperandShape.KindParen) {
  this.Fail("箭头函数参数形态");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindArrow;
shape.Raw = unit;
shape.Text = "=>";
ShapeInsertUtil.InsertBetween(top, params, shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Expect = StatementOperatorBody.ExpectArrowTail;
```

## method HasLooseParen:()=>bool

当前表达式最后挂的是不是**未解析参数表**（`KindParen` 且 `Data` 为空）。它只可能是箭头的参数，
所以后面不是 `=>` 就不是合法表达式——`Fail` 回 legacy，不让半棵树冒充结构证明。

```ts
const top = this.Top();
if (top.Data.length === 0) {
  return false;
}
const last = top.Data[top.Data.length - 1];
if (!(last instanceof StatementOperandShape)) {
  return false;
}
const shape = last as StatementOperandShape;
return shape.Kind === StatementOperandShape.KindParen && shape.Data.length === 0;
```

## static method TextOfToken:(unit:Token)=>string

`Common` / `Symbol` 的正文；其它单元返回空串（判型用）。

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method ParenFeedsArrow:(units:Array<Token>, bracket:Bracket)=>bool

**参数表前瞻**（S3n）：括号宿主之后的下一个**代码单元**是不是 `=>`。`(a, b) => …` 的圆括号同时是
「参数表候选」与「括号表达式」，S3n 让逗号可解析之后，必须靠这一格前瞻把它们区分开：

- 是 `=>`：括号内体标记 `ArrowParamTable`，逗号按参数分隔处理（本体失败 → `params`），
  箭头树与 legacy 同形，`op-ast-proof` 的 `arrow(params)` 文本不变；
- 不是：逗号按运算符处理，`(a, b) + c` 得到 `+((a,b),c)`。

只读 `Units` 与文本，不改 `StartArrow`、不解析参数表、不建任何节点。找不到括号（不在本壳单元里）时返回 `false`。

```ts
const at = units.indexOf(bracket);
if (at < 0) {
  return false;
}
for (let scan = at + 1; scan < units.length; scan++) {
  if (units[scan].IsTriviaToken) {
    continue;
  }
  return StatementOperatorBody.TextOfToken(units[scan]) === "=>";
}
return false;
```

## static method IsSupportedBinary:(text:string)=>bool

S3d：二元运算符集合**整体委托**给 `OperatorTable`（优先级数值仍只在那一处写），所以比较族 / 逻辑 / 位 / 移位 /
`**` / `instanceof` / `in` 全都在内，赋值与逗号（`Precedence` 对两者都返回 -1）自然被排除，不在这里另写一份清单。
逗号有自己的帧级分支（S3n，取 `OperatorTable.CommaPrecedence`），同样不经过这里。

```ts
return OperatorTable.IsBinaryOperator(text);
```

## static method IsPrefixText:(text:string, unit:Token)=>bool

前缀运算符集合也委托给 `OperatorTable.IsPrefixOperator`（`! ~ + - ++ -- typeof void delete` 全在）。
S3i 起 `++` / `--` 不再排除：legacy `ParseUnary` 对它们走的就是通用分支（`PrefixUnaryExpressionShape` + 操作数，
运算符不进 children、不进 operator 字段），与 `-a` 完全同构，所以形状层按同一口径接管。
语句**首格**是 `++`/`--` 时路由层按 `StatementClass.Postfix` 分类，但实测仍由表达式壳接管（`++a;` 的 `shapeAst=1`，见 s3i-cases）。

```ts
return OperatorTable.IsPrefixOperator(text);
```

## static method IsBareImport:(unit:Token)=>bool

**只拒绝「裸标识符 `import`」**（S3k-3 收窄）：表达式位的 `import` 现在建
`KindImportKeyword` 关键字叶子（不是 `KindIdentifier`），所以它接成员 / 调用不再被挡——
`import.meta` 是 `member(import, meta)`、`import("m")` 是 `call(import)`，两者的 AST 由
`StatementShapeAst` 按 legacy `ParsePrimary` 的同一棵树重建（`MetaPropertyShape` / `ImportKeywordShape`）。

留下来的这一条只挡「`import` 被当成普通标识符」那棵树（形状层若把它建成了 `KindIdentifier`，
成员 / 调用的 AST 会是 `PropertyAccessExpression(Identifier"import", …)`，与 legacy 不同）。
判据不放开，只是新形态根本不进这个分支。

```ts
if (!(unit instanceof StatementOperandShape)) {
  return false;
}
const shape = unit as StatementOperandShape;
return shape.Kind === StatementOperandShape.KindIdentifier && shape.Text === "import";
```

## static method IsTemplateUnit:(unit:String, template:Template)=>bool

是不是「引号内嵌」的模板串单元：与 `ExpressionBuilder.IsTemplateToken` **同一判据**——`String`、开了内插、
且引号属于模板配置的 `InterpolationQuoteChars`。TS 只有反引号在这个集合里，所以 `"…"` 永远走普通字符串。

```ts
if (!unit.IsSupportInterpolation) {
  return false;
}
const config = template.StringTemplate;
return config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(unit.StringChar);
```

## static method HasInterpolation:(unit:String)=>bool

模板里有没有内插段：`String.Data` 里出现 `InterpolationString` 就是有。
带内插的模板本片不接（`BuildOperand` 返回 `null` → `Fail` → legacy）：它要拆成 `TemplateHead` + 若干 `TemplateSpan`，
形状层还没有对应节点（见 `HANDOFF-s3f.md` 未覆盖清单）。

```ts
for (const part of unit.Data) {
  if (part instanceof InterpolationString) {
    return true;
  }
}
return false;
```

## static method IsKeywordLeafText:(text:string)=>bool

关键字字面量叶子（S3d）：只认这四个。它们必须在 `IsOperandText` 之前判定——`IsOperandText` 仍把关键字判 false
（那是「下一个语句的起点」判据，不是「能不能建叶子」判据）。

```ts
return text === "true" || text === "false" || text === "null" || text === "this";
```

## static method AmbiguousTypeArguments:(units:Array<Token>, at:int)=>bool

`<` 在操作数之后**既可能是小于号，也可能是类型实参表的开头**：`f < T > (x)` 在 legacy 里是 `f<T>(x)` 调用
（`ExpressionBuilder.ParseBinary` 用 `CanStartTypeArgumentCall` 判的）。形状层不做类型解析，所以用**保守的向前看**：

- 从 `<` 之后扫到**深度归零的那个 `>`**（`<` / `>` 记深度，`>>`/`>>>` 按连续的 `>` 记）；
- 深度归零的那个 `>` 后面紧跟一个 `(` 圆括号单元 → 判为类型实参调用，放弃本体（legacy 会按类型实参解析）；
- 其它一切情形（看不见 `>`、`;` / EOF 先到、深度 0 处出现无法进入类型实参表的括号、`>>` 跨过深度 0）
  一律按普通小于号处理。

判错的代价不对称：**多判成类型实参 = 少接管一条（legacy 仍然对）**；少判成类型实参 = 建出与 legacy 不同的错树。
所以这里只在证据足够时才返回 `true`。

```ts
let depth = 0;
let close = -1;
for (let index = at + 1; index < units.length; index++) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof EndOfFileTokenShape) {
    return false;
  }
  if (!(unit instanceof Symbol)) {
    if (depth === 0 && unit instanceof Bracket) {
      return false;
    }
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === ";") {
    return false;
  }
  if (text === "<") {
    depth++;
    continue;
  }
  if (text === ">") {
    if (depth > 1) {
      depth--;
      continue;
    }
    close = index;
    break;
  }
  if (text === ">>" || text === ">>>") {
    if (depth > text.length) {
      depth -= text.length;
      continue;
    }
    if (depth === text.length) {
      depth = 0;
      continue;
    }
    if (text.length - depth === 1) {
      close = index;
      break;
    }
    return false;
  }
}
if (close < 0) {
  return false;
}
let nextIndex = close + 1;
while (nextIndex < units.length && units[nextIndex].IsTriviaToken) {
  nextIndex++;
}
const next = nextIndex < units.length ? units[nextIndex] : null;
if (next === null) {
  return false;
}
if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
  return true;
}
// S3f：`f<T>`t`` 的 `>` 是**类型实参的收口**，不是大于号——模板单元（String）紧跟 `>` 时同样判为类型实参。
// 判成类型实参只会少接管一条（legacy 仍对）；漏判则会建出「>(f,T) 把模板当右操作数」的错树。
// 因此这里连普通字符串 `a < b > "s"` 也一并放弃（保守方向是安全的）。
return next instanceof String;
```

## static method HasTypeArgumentCall:(units:Array<Token>)=>bool

**为什么判据不在 `Ingest` 里做**：壳是**逐格**喂单元的（每来一个 basic token 就 `IngestAll(this.Data)` 一次），
所以读到 `<` 的那一格后面还没有单元——向前看只能看到「还没读到」。因此这条判据放在 `IngestAll` **每格收尾处**、
在 `Units` 已经是当前全部单元之后跑一遍：一旦某个 `<` 满足「深度归零的 `>` 紧跟 `(`」，本体立刻 `Fail`（撤槽位、
停止接管），AST 由 legacy 按类型实参调用解析。判错只损失接管条数，不会建错树。

```ts
const code:Array<Token> = [];
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  code.push(unit);
}
for (let index = 0; index < code.length; index++) {
  const unit = code[index];
  if (unit instanceof Symbol && (unit as Symbol).TempToString() === "<") {
    // Stage 5d-8b：`AmbiguousTypeArguments` 是**宽松**扫描（不认识的符号原样跳过），它单独一条会把
    // `a < b && c > (d)` 也判成「`>` 后面紧跟 `(`」的泛型调用——而 TS 与 legacy `ParsePostfix` 用的
    // 是 `AngleJudge.FindClose`（碰到 `&&` 就判否）。这里把两条判据**同时**要求成立：
    // 宽松扫描说「像泛型调用」、唯一判据 `AngleJudge.CanStart` 也说「是类型实参」才放弃接管。
    // 只会让「确实是比较链」的形状树继续建（`a < b && c > (d)` 由 `ast-json-diff` 逐字节核）。
    if (StatementOperatorBody.AmbiguousTypeArguments(code, index) && AngleJudge.CanStart(code, index)) {
      return true;
    }
  }
}
return false;
```

## static method LooksNumber:(unit:Common)=>bool

这个 `Common` 是不是数字叶子——判据**直接复用字面量工厂的接受集**，不另写一份字符规则：
`Common.IsNumber()`（= `NumericLiteralShape.FromBasicToken` 的入参校验）或 `Common.IsBigInt()`
（= `BigIntLiteralShape`）。所以前导点 `.5` / `.5e2` / `.5e+2`、尾点 `1.`、十六进制 `0x1f`、分隔符 `1_000`
全部归 `KindNumber`，与 legacy `ExpressionBuilder.ParsePrimary` 的
`StartsNumber` → `IsBigInt() ? BigInt : Numeric` 分派同口径。

**BigInt 仍判 `KindNumber`**（不是 Identifier）：S3d 起收口器 `StatementShapeAst` 用
`BigIntLiteralShape.FromBasicToken` 建它（与 legacy `ParsePrimary` 同一工厂），所以它既不会走错分支、
也不会静默退化成标识符。

```ts
return unit.IsNumber() || unit.IsBigInt();
```

## static method IsOperandText:(text:string)=>bool

`Common` 能不能当操作数叶子：非空、且不是保留字 / 字面关键字 / 前缀关键字 / 二元关键字。
这些起点本来就不该走表达式体（`true` / `null` / `this` 应是字面量形状、`typeof` 应是前缀节点），S3a 先不接，判 `false`。

```ts
if (text === "") {
  return false;
}
if (text === "true" || text === "false" || text === "null" || text === "undefined") {
  return false;
}
if (text === "this" || text === "super" || text === "new" || text === "function") {
  return false;
}
if (text === "typeof" || text === "void" || text === "delete" || text === "await" || text === "yield") {
  return false;
}
if (text === "instanceof" || text === "in" || text === "as" || text === "satisfies" || text === "of") {
  return false;
}
return true;
```

## method StartNonNull:(unit:Token, template:Template)=>void

后缀非空断言 `!`（S3i）：与后缀自增自减同一条插入路径（`InsertionPoint` 会穿过前缀节点，
所以 `-a!` 在 legacy 里是 `-(a!)`，这里同样把 `!` 插在前缀的操作数上），插完仍在 `ExpectOperator`。

```ts
const point = this.InsertionPoint();
if (point.length !== 2) {
  this.Fail("非空断言缺少操作数");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindNonNull;
shape.Text = "!";
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(point[0], point[1], shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Expect = StatementOperatorBody.ExpectOperator;
```

## method StartTypeAssert:(unit:Token, text:string, template:Template)=>void

类型断言 `as` / `satisfies`（Stage 5d-7）：**按二元运算符的插入路径**建一格 `KindTypeAssert`
（优先级取 `OperatorTable.AsPrecedence`，与 `ExpressionBuilder.ParseBinary` 的 `IsTypeOperator` 分支同一数值），
随后转 `ExpectTypeTail`——`as` 右边的**类型**整段吞掉。

**为什么不能复用 `StartNonNull` 的「包住最后一个操作数」**：`as` 是关系级运算符，不是后缀。
`a + b as T` 在 TS 里是 `(a + b) as T`（`+` 优先级更高、先收敛），包住 `b` 会建出 `a + (b as T)`——
`ast-json-diff` 的 `expression` 夹具 #293 立刻报位置差（`AsExpression[0,10]` vs `[3,10]`）。
所以这里先按优先级弹栈（与 `PushOperator` 同一个 while），再把整段左表达式插进新节点。

**为什么插入后立刻把帧标成完整**：右边不是操作数而是类型，`AttachOperand` 永远不会来把它清成 complete；
类型区域由 `ExpectTypeTail` 吞掉、由收口器交给 legacy 解析。链式断言（`a as T as U`）整段在收口器里逐层包，
不回到本状态机（后面所有单元都已经属于类型区域）。

```ts
const precedence = OperatorTable.AsPrecedence;
while (this.Frames.length > 0 && !this.FramePending[this.Frames.length - 1]
  && this.FramePrecs[this.FramePrecs.length - 1] !== StatementOperatorBody.CondPrecedence
  && this.FramePrecs[this.FramePrecs.length - 1] > precedence) {
  this.CompleteTop();
}
if (this.Frames.length > 0 && this.FramePending[this.FramePending.length - 1]) {
  this.Fail("类型断言缺少左操作数");
  return;
}
const parent = this.Top();
if (parent.Data.length === 0) {
  this.Fail("类型断言缺少左操作数");
  return;
}
const child = parent.Data[parent.Data.length - 1];
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindTypeAssert;
shape.Text = text;
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(parent, child, shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Frames.push(shape);
this.FramePrecs.push(precedence);
// 右边是类型，不会走 `AttachOperand`：这一帧直接标完整（`IsComplete` 的帧判据因此成立）。
this.FramePending.push(false);
this.Expect = StatementOperatorBody.ExpectTypeTail;
```

## method TrackTypeTail:(unit:Token)=>void

类型区域吞格时维护两个判据状态：尖括号深度（`,` 是不是类型里的分隔符）与「出现过 `?`」
（`:` 是条件类型的一部分还是外层条件表达式的冒号）。

```ts
if (!(unit instanceof Symbol)) {
  return;
}
const text = (unit as Symbol).TempToString();
if (text === "?") {
  this.TypeTailQuestion = true;
  return;
}
if (text === "<") {
  this.TypeTailAngle++;
  return;
}
if (text === ">") {
  if (this.TypeTailAngle > 0) {
    this.TypeTailAngle--;
  }
  return;
}
if (text === ">>" || text === ">>>") {
  this.TypeTailAngle -= text.length;
  if (this.TypeTailAngle < 0) {
    this.TypeTailAngle = 0;
  }
}
```

## method EndsTypeTail:(unit:Token)=>bool

类型区域是不是到此为止（Stage 5d-8b）。**只认「类型里绝不可能出现」的那几格**，其余一律继续吞
（宁可吞多了让收口器判否，也不在这里猜类型文法）：

- `,` 在尖括号深度 0：逗号表达式 / 实参分隔符（`a as Foo<A, B>` 的逗号在深度 1，不算）；
- `:` 且类型区域里没出现过 `?`：外层条件表达式的冒号（`T extends U ? X : Y` 的 `?` 先来过，就不会误判）；
- `+ * / % && || ?? =`：值位运算符，类型文法里没有；
- `instanceof` / `in` 关键字。

`as` / `satisfies` **不在这里断**：链式断言（`a as T as U`）整段留在同一个 `KindTypeAssert` 里，由收口器
的循环逐层包，与 legacy 的左结合同形。`-` 也不断（`a as -1` 这类负字面量类型），`=>` 不断（函数类型）。

```ts
if (!(unit instanceof Symbol) && !(unit instanceof Common)) {
  return false;
}
const text = StatementOperatorBody.TextOfToken(unit);
if (text === "+" || text === "*" || text === "/" || text === "%") {
  return true;
}
if (text === "&&" || text === "||" || text === "??" || text === "=") {
  return true;
}
if (text === "instanceof" || text === "in") {
  return true;
}
if (text === ",") {
  return this.TypeTailAngle === 0;
}
if (text === ":") {
  return !this.TypeTailQuestion;
}
return false;
```

## method StartTaggedTemplate:(unit:Token, template:Template)=>void

标签模板的后缀（Stage 5d-7）：模板串单元读到**操作数之后**，当前表达式原地成为 `KindTaggedTemplate` 的标签。

**与成员 / 调用 / 非空断言同一条插入路径**（`InsertionPoint` + `ShapeInsertUtil.InsertBetween`）：
所以「标签」不必是标识符——`a!`（非空断言节点）、`[a,b]`（数组字面量）、`new C()`（`new` 前缀节点）、
`a?.b()`（可选链 + 调用）、`(a)`（括号节点）、`String.raw`（成员链）都由**各自已有的分支**先在树上建好，
这里只是把刚建好的那个节点包一格。AST 侧（`StatementShapeAst` 的 `KindTaggedTemplate` 分支）再把这一格
交给 legacy `ParseTemplateToken` 建模板、`TaggedTemplateExpressionShape` 建外层，children / `Pos` / 区间
与 `ExpressionBuilder.ParsePostfixSuffix` 的模板分支逐字段同源。

插完仍在 `ExpectOperator`：``tag`t`.b `` / ``tag`t`(1) `` / ``tag`t`! `` 的后续后缀由普通后缀分支接上。

**类型实参 + 模板**（``a<T>`t` ``）不在这里判：那个 `<` 会被 `IngestAll` 收尾处的
`AmbiguousTypeArguments` 判据（`>` 后面紧跟模板串即判类型实参）整条放弃，仍然安全退出。

```ts
const point = this.InsertionPoint();
if (point.length !== 2) {
  this.Fail("标签模板缺少标签");
  return;
}
if (StatementOperatorBody.IsBareImport(point[1])) {
  this.Fail("import 开头的标签模板");
  return;
}
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindTaggedTemplate;
shape.Raw = unit;
ShapeInsertUtil.InsertBetween(point[0], point[1], shape);
this.Inserts++;
StatementOperatorBody.TotalInserts++;
this.Expect = StatementOperatorBody.ExpectOperator;
```
