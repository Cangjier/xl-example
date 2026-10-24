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

## static field KindHolder:int = 0

根持有者（`StatementOperatorBody.Root`）：不是表达式节点，只用来挂最外层 shape，所以它永远不要被渲染。

## static field KindIdentifier:int = 1

标识符叶子。

## static field KindNumber:int = 2

数字字面量叶子（判定见 `StatementOperatorBody.LooksNumber`）。

## static field KindOperator:int = 3

二元运算符节点：`Data = [左操作数, 右操作数]`、`Text = 运算符`。**运算符不是子单元**（见文件头：不造第二份运算符映射）。

## static field KindPrefix:int = 4

前缀一元节点：`Data = [操作数]`、`Text = 运算符`。

## static field KindParen:int = 5

圆括号节点：`Data = [括号内表达式]`。括号的意义就是「把一段中缀运算整体当成一个操作数」，
所以它渲染成 `(b+c)`，不是 `(+(b,c))`——见 `RenderInfix`。

## constructor:(template:Template)=>void

```ts
super(template);
```

# class StatementOperatorBody

**表达式体的增量状态机**（Stage 3 S3a/S3b，设计 §4.2）：壳（`StatementShape`，`Kind = ShellPlainExpression`）每攒到一个
basic token 就把新单元喂进来一格，本类**立刻**建对应的节点：

- 需要操作数（`Expect == 1`）时：标识符 / 数字 / 圆括号 → 建叶子；前缀 `+ - ! ~` 与 `typeof/void/delete` → 建前缀节点；
- 需要运算符（`Expect == 2`）时：`+ - * / %` → 从 `OperatorTable` 读优先级与结合性，**立刻**建 `KindOperator` 节点，
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

**不支持就停**：任何没实现的单元（成员访问 `.`、调用 `(`、索引 `[`、对象字面量 `{`、字符串/模板/正则字面量、
`**` 之外的其它优先级运算符、赋值 `=`、逗号、类型断言 `as` …）一律 `Incomplete = true` 并**停止摄入**，
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
if (this.Nested) {
  return;
}
StatementOperatorBody.LastText = this.Text();
StatementOperatorBody.LastComplete = this.IsComplete();
if (StatementOperatorBody.LastComplete && StatementOperatorBody.LastText !== "") {
  this.Publish(StatementOperatorBody.LastText);
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
  this.PushBinary(text, template);
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
- `Common` 且不是保留字/前缀关键字：`LooksNumber` 分 `KindNumber` / `KindIdentifier`；
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
  if (inner.Root !== null && inner.Root.Data.length > 0) {
    shape.Add(inner.Root.Data[0]);
  }
  return shape;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (!StatementOperatorBody.IsOperandText(text)) {
    return null;
  }
  const shape = new StatementOperandShape(template);
  shape.Kind = StatementOperatorBody.LooksNumber(text)
    ? StatementOperandShape.KindNumber
    : StatementOperandShape.KindIdentifier;
  shape.Text = text;
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

## method PushBinary:(text:string, template:Template)=>void

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

S3b 实现的二元运算符**恰好**是这五个：优先级/结合性仍从 `OperatorTable` 读，不在这里写数值。
其余优先级 >= 0 的运算符（`**` `&&` `||` `<<` …）S3b 不支持，走 `Incomplete`（未覆盖清单）。

```ts
return text === "+" || text === "-" || text === "*" || text === "/" || text === "%";
```

## static method IsPrefixText:(text:string, unit:Token)=>bool

前缀运算符：`+ - ! ~`（符号）与 `typeof/void/delete`（`Common`）。`++ / --`（自增自减）S3b 不支持。

```ts
if (unit instanceof Symbol) {
  return text === "+" || text === "-" || text === "!" || text === "~";
}
return text === "typeof" || text === "void" || text === "delete";
```

## static method LooksNumber:(text:string)=>bool

数字字面量的开头判定：首字符是 `0..9`（十六进制 `0x`、小数点 `.5` 里只有 `.5` 会漏判，S3b 不要 `.5`，
它没有小数点在前的写法；这条列进未覆盖清单）。

```ts
if (text === "") {
  return false;
}
const head = text.charAt(0);
return head >= "0" && head <= "9";
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
