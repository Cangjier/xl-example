# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { IdentifierIncompleteGuard } from "../expressions/forms/primary/identifier-incomplete-guard.xl.md"
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

```txt
1*2+3   ->  +(*(1,2),3)
a+b*c   ->  +(a,*(b,c))
a-b-c   ->  -(-(a,b),c)
```

## field Kind:int = 0

## field Text:string = ""

## field Raw:Token | null = null

## field Args:Token | null = null

## field Colon:Token | null = null

## field TailEnd:Token | null = null

## field Open:bool = false

## static field KindHolder:int = 0

## static field KindIdentifier:int = 1

## static field KindNumber:int = 2

## static field KindOperator:int = 3

## static field KindPrefix:int = 4

## static field KindParen:int = 5

## static field KindKeyword:int = 6

## static field KindString:int = 7

## static field KindTemplate:int = 8

## static field KindRegex:int = 9

## static field KindMember:int = 10

## static field KindCall:int = 11

## static field KindIndex:int = 12

## static field KindArray:int = 13

## static field KindObject:int = 14

## static field KindNew:int = 15

## static field KindQuestionDot:int = 16

## static field KindOptionalMember:int = 17

## static field KindOptionalCall:int = 18

## static field KindOptionalIndex:int = 19

## static field KindConditional:int = 20

## static field KindNonNull:int = 22

## static field KindImportKeyword:int = 23

## static field KindPostfix:int = 21

## static field KindArrow:int = 24

## static field KindFunction:int = 25

## static field KindClass:int = 26

## static field KindTaggedTemplate:int = 27

## static field KindTypeAssert:int = 28

## static field KindNewTarget:int = 29

## static field KindTypeArguments:int = 30

## static field KindPrivateName:int = 31

## static field KindAwait:int = 32

## static field KindYield:int = 33

## constructor:(template:Template)=>void

```ts
super(template);
```

# class StatementOperatorBody

## field Template:Template

## field Root:Token | null = null

## field Frames:Array<Token> = []

## field FramePrecs:Array<int> = []

## field FramePending:Array<bool> = []

## field AwaitName:Token | null = null

## field AwaitOptional:Token | null = null

## field AwaitMeta:bool = false

## field AwaitPrivate:Token | null = null

## field Prefixes:Array<Token> = []

## field AwaitBody:Token | null = null

## field ArrowBodyUnits:int = 0

## field TypeTailUnits:int = 0

## field TypeTailAngle:int = 0

## field TypeTailQuestion:bool = false

## field Conditionals:Array<Token> = []

## field Expect:int = 1

## field Ingested:int = 0

## field Units:Array<Token> = []

## field PreviousUnit:Token | null = null

## field SawLessThan:bool = false

## field Incomplete:bool = false

## field Reason:string = ""

## field Inserts:int = 0

## field Closed:bool = false

## field Nested:bool = false

## field ArrowParamTable:bool = false

## field Slot:int = -1

## field Counted:bool = false

## static field ExpectOperand:int = 1

## static field ExpectOperator:int = 2

## static field ExpectName:int = 3

## static field ExpectOptional:int = 4

## static field ExpectBody:int = 5

## static field ExpectArrowTail:int = 6

## static field ExpectTypeTail:int = 7

## static field ExpectPrivateName:int = 8

## static field CondPrecedence:int = 1

## static field TotalBodies:int = 0

## static field TotalInserts:int = 0

## static field TotalIncomplete:int = 0

## static field ShapeTexts:Array<string> = []

## static field LastText:string = ""

## static field LastComplete:bool = false

## constructor:(template:Template)=>void

```ts
this.Template = template;
```

## method Holder:()=>Token

```ts
if (this.Root === null) {
  const root = new StatementOperandShape(this.Template);
  root.Kind = StatementOperandShape.KindHolder;
  this.Root = root;
}
return this.Root;
```

## method Top:()=>Token

```ts
if (this.Frames.length > 0) {
  return this.Frames[this.Frames.length - 1];
}
return this.Holder();
```

## method IngestAll:(units:Array<Token>, template:Template)=>void

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
## method LastCodeIndex:()=>int

[实例级增量判据·S4b] `Units` 里最后一个**代码单元**的下标（跳过尾随 trivia）。全是 trivia / 空表返回 `-1`。

```ts
let index = this.Units.length - 1;
while (index >= 0 && this.Units[index].IsTriviaToken) {
  index--;
}
return index;
```

## method IsOperandGrowing:()=>bool

[实例级增量判据·S4b] 本格末位的操作数是不是「还在长的标识符」——`this.半` / `球.数` 这种**名字没闭合**的
标识符。判据只有一份：`IdentifierIncompleteGuard.IsComplete`（WP-S4 的 R4-1，接线点在这里）。

只对 `BuildOperand` 会建成 `KindIdentifier` 的单元下结论：关键字叶子（`this` / `super` / `import` / `true` …）、
数字字面量、以及其它形态一律返回 `false`——`1` → `12` 的数字增长不属本判据（R4-4 另有 owner）。

```ts
const last = this.LastCodeIndex();
if (last < 0) {
  return false;
}
const unit = this.Units[last];
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
const text = common.TempToString();
if (StatementOperatorBody.IsKeywordLeafText(text) || text === "super") {
  return false;
}
if (!StatementOperatorBody.IsOperandText(text)) {
  return false;
}
if (StatementOperatorBody.LooksNumber(common) || common.CanStartNumber()) {
  return false;
}
return !IdentifierIncompleteGuard.IsComplete(this.Units, last);
```

## method IsComplete:()=>bool

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
// [S4b] 末位操作数还是**没闭合的标识符**（`this.半`）时，本条表达式不算完整：名字的下一格可能还是
// 同一个标识符的后继字符，本格物化出来的 `IdentifierShape` 只会拿到半个名字（`text="半"`），
// 而下一格必定要在同一格里把它拉长（S4 报告 §3 的「已发布形状被降级为 raw」）。
// 这里只影响「本格要不要物化」：`;` / `=` / `)` 一分隔，末位就不再是标识符，收口路径不受影响。
if (this.IsOperandGrowing()) {
  return false;
}
return true;
```

## method Publish:(text:string)=>void

```ts
if (this.Slot < 0) {
  this.Slot = StatementOperatorBody.ShapeTexts.length;
  StatementOperatorBody.ShapeTexts.push(text);
  return;
}
StatementOperatorBody.ShapeTexts[this.Slot] = text;
```

## method Ingest:(unit:Token, template:Template)=>void

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

```ts
this.PushOperator(unit, text, OperatorTable.Precedence(text), OperatorTable.AssociationOf(text) === "right", template);
```

## method PushAssignment:(unit:Token, text:string, template:Template)=>void

```ts
this.PushOperator(unit, text, OperatorTable.AssignmentPrecedence, true, template);
```

## method PushOperator:(unit:Token, text:string, precedence:int, rightAssoc:bool, template:Template)=>void

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

```ts
this.Frames.pop();
this.FramePrecs.pop();
this.FramePending.pop();
```

## method StartNew:(unit:Token, template:Template)=>void

```ts
const shape = new StatementOperandShape(template);
shape.Kind = StatementOperandShape.KindNew;
shape.Raw = unit;
this.Prefixes.push(shape);
```

## method StartNewTarget:(unit:Token, template:Template)=>bool

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

```ts
const shape = new StatementOperandShape(template);
shape.Kind = text === "yield" ? StatementOperandShape.KindYield : StatementOperandShape.KindAwait;
shape.Raw = unit;
shape.Text = text;
this.Prefixes.push(shape);
```

## method AttachDanglingAwaitYield:()=>bool

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

```ts
if (this.Root === null || this.Root.Data.length === 0) {
  return "";
}
return StatementOperatorBody.Render(this.Root.Data[0]);
```

## static method Render:(token:Token)=>string

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

```ts
return OperatorTable.IsBinaryOperator(text);
```

## static method IsPrefixText:(text:string, unit:Token)=>bool

```ts
return OperatorTable.IsPrefixOperator(text);
```

## static method IsBareImport:(unit:Token)=>bool

```ts
if (!(unit instanceof StatementOperandShape)) {
  return false;
}
const shape = unit as StatementOperandShape;
return shape.Kind === StatementOperandShape.KindIdentifier && shape.Text === "import";
```

## static method IsTemplateUnit:(unit:String, template:Template)=>bool

```ts
if (!unit.IsSupportInterpolation) {
  return false;
}
const config = template.StringTemplate;
return config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(unit.StringChar);
```

## static method HasInterpolation:(unit:String)=>bool

```ts
for (const part of unit.Data) {
  if (part instanceof InterpolationString) {
    return true;
  }
}
return false;
```

## static method IsKeywordLeafText:(text:string)=>bool

```ts
return text === "true" || text === "false" || text === "null" || text === "this";
```

## static method AmbiguousTypeArguments:(units:Array<Token>, at:int)=>bool

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

```ts
return unit.IsNumber() || unit.IsBigInt();
```

## static method IsOperandText:(text:string)=>bool

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
