# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { OperatorTable } from "../expressions/operator-table.xl.md"
import { ShapeInsertUtil } from "../shape-insert-util.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
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

## field Prefixes:Array<Token> = []

已经读到、但操作数还没到的前缀节点（`-a` 的 `-`）。操作数到达时按后进先出包上去，再挂进当前帧。

## field Expect:int = 1

期望状态：`1` = 下一个代码单元应当是操作数（或前缀）；`2` = 应当是一个二元运算符，或表达式到此为止。

## field Ingested:int = 0

已经喂进本状态机的单元数（含 trivia）：`IngestAll` 只从它往后扫，**只追加**，不重扫前缀。

## field Units:Array<Token> = []

本壳当前的单元序列（`IngestAll` 每次覆盖成入参）。只给「`<` 是小于号还是类型实参表」这一处向前看用，
不参与建树：`Ingest` 拿 `Ingested - 1` 当游标去 `AmbiguousTypeArguments` 里看后面的单元。

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

## field Slot:int = -1

本体在 `ShapeTexts` 里的槽位；`-1` 表示还没发布过。同一个体每格求值都把**同一个槽位覆盖**成最新结构——
中间格可能只是「前缀恰好完整」（`-a+b` 的 `-(a)`），最终格才是整条表达式的结构。

## field Counted:bool = false

`TotalBodies` 只在本体第一次 `IngestAll` 时 +1（嵌套体不算）：建体与摄入在同一处发生，括号内部不会被重复计数。

## static field ExpectOperand:int = 1

## static field ExpectOperator:int = 2

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
if (this.Incomplete || this.Expect !== StatementOperatorBody.ExpectOperator) {
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
if (unit instanceof Symbol && (unit as Symbol).Is("<")) {
  this.SawLessThan = true;
}
if (unit instanceof EndOfFileTokenShape) {
  return;
}
if (unit instanceof Symbol && (unit as Symbol).Is(";")) {
  return;
}
const text = StatementOperatorBody.TextOfToken(unit);
if (this.Expect === StatementOperatorBody.ExpectOperand) {
  if (text !== "" && StatementOperatorBody.IsPrefixText(text, unit)) {
    const prefix = new StatementOperandShape(template);
    prefix.Kind = StatementOperandShape.KindPrefix;
    prefix.Text = text;
    prefix.Raw = unit;
    this.Prefixes.push(prefix);
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
if (text !== "" && StatementOperatorBody.IsSupportedBinary(text)) {
  this.PushBinary(unit, text, template);
  return;
}
if (unit instanceof Common && StatementOperatorBody.IsOperandText(text)) {
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
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar !== "(") {
    return null;
  }
  const inner = new StatementOperatorBody(template);
  inner.Nested = true;
  inner.IngestAll(bracket.Data, template);
  if (inner.Incomplete || !inner.IsComplete()) {
    return null;
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

## method AttachOperand:(built:Token)=>void

操作数到达：先把还挂着的前缀节点按后进先出包上去，再挂进 `Top()`；若父是正在等右操作数的二元节点，就把它标成完整。

```ts
let shape = built;
while (this.Prefixes.length > 0) {
  const prefix = this.Prefixes.pop()!;
  prefix.Add(shape);
  shape = prefix;
}
this.Top().Add(shape);
if (this.Frames.length > 0) {
  this.FramePending[this.Frames.length - 1] = false;
}
```

## method PushBinary:(unit:Token, text:string, template:Template)=>void

遇二元运算符**立刻**建节点：先按 `OperatorTable` 的优先级/结合性弹掉已经完整的栈顶（左结合收敛），
再用 `ShapeInsertUtil.InsertBetween` 把新节点插进「父单元与最后一个子单元」之间——**这一步就是 S3b 的增量插入**，
左操作数原地变成新节点的子单元。最后压栈、转「等操作数」。

弹栈的条件与 `FeasOperatorParser` 的整段版**同一口径**：栈顶完整且（栈顶优先级 > 当前，或等于且非右结合）。

```ts
const precedence = OperatorTable.Precedence(text);
const rightAssoc = OperatorTable.IsRightAssociative(text);
while (this.Frames.length > 0 && !this.FramePending[this.Frames.length - 1]
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

## method CompleteTop:()=>void

弹掉一个已经完整的栈顶二元节点（它的 `Data` 里左右操作数都在，引用仍挂在父单元里，只是不再参与优先级比较）。

```ts
this.Frames.pop();
this.FramePrecs.pop();
this.FramePending.pop();
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
  if (shape.Kind === StatementOperandShape.KindPrefix) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.Render(shape.Data[0]) : "?";
    return shape.Text + "(" + only + ")";
  }
  if (shape.Kind === StatementOperandShape.KindParen) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return "(" + only + ")";
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
  if (shape.Kind === StatementOperandShape.KindPrefix) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return shape.Text + only;
  }
  if (shape.Kind === StatementOperandShape.KindParen) {
    const only = shape.Data.length > 0 ? StatementOperatorBody.RenderInfix(shape.Data[0]) : "?";
    return "(" + only + ")";
  }
  return shape.Text;
}
return "?";
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

## static method IsSupportedBinary:(text:string)=>bool

S3d：二元运算符集合**整体委托**给 `OperatorTable`（优先级数值仍只在那一处写），所以比较族 / 逻辑 / 位 / 移位 /
`**` / `instanceof` / `in` 全都在内，赋值与逗号（优先级 -1）自然被排除，不在这里另写一份清单。

```ts
return OperatorTable.IsBinaryOperator(text);
```

## static method IsPrefixText:(text:string, unit:Token)=>bool

前缀运算符集合也委托给 `OperatorTable.IsPrefixOperator`（`! ~ + - typeof void delete` 全在），
但**显式排除 `++` / `--`**：自增自减的 AST 需要 `PrefixUnaryExpressionShape` 带 operator 字段，legacy 目前只是
`PrefixUnaryExpressionShape` + 操作数（operator 不进节点），S3d 不接管，走 `Incomplete`（未覆盖清单）。

```ts
if (text === "++" || text === "--") {
  return false;
}
return OperatorTable.IsPrefixOperator(text);
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
return next !== null && next instanceof Bracket && (next as Bracket).StartBracketChar === "(";
```

## static method HasTypeArgumentCall:(units:Array<Token>)=>bool

**为什么判据不在 `Ingest` 里做**：壳是**逐格**喂单元的（每来一个 basic token 就 `IngestAll(this.Data)` 一次），
所以读到 `<` 的那一格后面还没有单元——向前看只能看到「还没读到」。因此这条判据放在 `IngestAll` **每格收尾处**、
在 `Units` 已经是当前全部单元之后跑一遍：一旦某个 `<` 满足「深度归零的 `>` 紧跟 `(`」，本体立刻 `Fail`（撤槽位、
停止接管），AST 由 legacy 按类型实参调用解析。判错只损失接管条数，不会建错树。

```ts
for (let index = 0; index < units.length; index++) {
  const unit = units[index];
  if (unit instanceof Symbol && (unit as Symbol).TempToString() === "<") {
    if (StatementOperatorBody.AmbiguousTypeArguments(units, index)) {
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
