# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { OperatorTable } from "../expressions/operator-table.xl.md"
import { ParenthesizedExpressionShape } from "../expressions/parenthesized-expression-shape.xl.md"
import { PostfixUnaryExpressionShape } from "../expressions/postfix-unary-expression-shape.xl.md"
import { PrefixUnaryExpressionShape } from "../expressions/prefix-unary-expression-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { ShapeInsertUtil } from "../shape-insert-util.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectTokenUtil } from "./direct-token-util.xl.md"
```

# namespace cangjie

表达式直建引擎：token 一关闭就建节点。两层状态（等操作数 / 等运算符）+ 二元 frame 栈的优先级旋转 +
括号嵌套引擎 + 前缀/后缀一元。**不做 fallback**：范围外构造 `Fail`（= Decline），接不上的单元只 `Held`。

# class DirectExpressionEngine

```txt
2*3+1   -> BinaryExpressionShape(+)[ BinaryExpressionShape(*)[2,*,3], +, 1 ]
2*(3+1) -> BinaryExpressionShape(*)[2, *, ParenthesizedExpressionShape(+(3,1))]
-a*+b   -> BinaryExpressionShape(*)[ -a, *, +b ]
a**b**c -> BinaryExpressionShape(**)[a, **, BinaryExpressionShape(**)[b, **, c]]
```

## static field ExpectOperand:int = 1

## static field ExpectOperator:int = 2

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Units:Array<Token> = []

## field Ingested:int = 0

## field PreviousEnd:int = -1

## field Frames:Array<Token> = []

## field FramePrecs:Array<int> = []

## field FramePending:Array<bool> = []

## field Prefixes:Array<Token> = []

## field PendingOperand:Token | null = null

## field Expect:int = 1

## field Declined:bool = false

## field Reason:string = ""

## field Inserts:int = 0

## field Root:Token | null = null

## field Held:bool = false

## field HeldAt:int = -1

## field LayerEnded:bool = false

## constructor:(template:Template, context:SyntaxContext, basePos:int)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
// `Root` 是**容器**（holder）：顶层操作数、括号、二元 frame 都挂在它下面；`Finish` 返回它唯一的子节点。
this.Root = new ShapeToken(template);
this.Expect = DirectExpressionEngine.ExpectOperand;
```

## method IngestAll:(units:Array<Token>)=>void

```ts
// 与 `StatementOperatorBody.IngestAll` 同构的增量循环：幂等（只处理 `Ingested` 之后的新单元）、
// 不改 `units` / 不改任何 raw token。Pos 口径与 `ExpressionBuilder.Load` 逐位一致：
// 首个非 trivia 单元用 `BasePos`，其后用上一个非 trivia 单元的 `EndIndex`（DESIGN §4.3 / R1）。
this.Units = units;
while (this.Ingested < units.length && !this.Declined && !this.Held && !this.LayerEnded) {
  const unit = units[this.Ingested];
  if (unit.IsTriviaToken) {
    this.Ingested += 1;
    continue;
  }
  const pos = this.PreviousEnd < 0 ? this.BasePos : this.PreviousEnd;
  if (unit.SourceRange.EndIndex >= 0) {
    this.PreviousEnd = unit.SourceRange.EndIndex;
  }
  this.IngestUnit(unit, pos);
  this.Ingested += 1;
}
```

## method IngestUnit:(unit:Token, pos:int)=>void

```ts
if (this.Declined || this.Held || this.LayerEnded) {
  return;
}
if (unit.IsTriviaToken) {
  return;
}
const text = DirectTokenUtil.TextOf(unit);
if (this.Expect === DirectExpressionEngine.ExpectOperand) {
  this.IngestOperand(unit, text, pos);
  return;
}
this.IngestOperator(unit, text, pos);
```

## method Finish:()=>Token | null

```ts
// 收尾：先补最后那个操作数（前缀在 FlushOperand 里包在操作数外），再收掉所有完整 frame。
// `Held` 不是失败：它只表示「后面那个单元可能不属于本层」，留给 session 按 `HeldAt` 判边界（DESIGN §4.6）。
if (this.Declined) {
  return null;
}
this.FlushOperand();
// 还有 frame 在等右操作数（`a+`）→ 不完整；完整 frame 才能按「最后一个子节点」封 end 后出栈。
for (const pending of this.FramePending) {
  if (pending) {
    this.Fail("二元运算符缺少右操作数");
    return null;
  }
}
this.CompleteAllFrames();
if (this.Frames.length !== 0 || this.Prefixes.length !== 0 || this.PendingOperand !== null) {
  this.Fail("表达式没有闭合");
  return null;
}
if (this.Root === null || this.Root.Data.length !== 1) {
  this.Fail("表达式没有唯一的根节点");
  return null;
}
return this.Root.Data[0];
```

## method IsComplete:()=>bool

```ts
// 「再调一次 Finish 会不会成功」。注意最后那个 `PendingOperand` 还没挂父节点，但它会把栈顶
// 正在等右操作数的 frame 补完，所以判断时要把它算进去（不能因为 frame 还 pending 就报不完整）。
if (this.Declined || this.Held) {
  return false;
}
let roots = this.Root === null ? 0 : this.Root.Data.length;
if (this.PendingOperand !== null) {
  for (let index = 0; index < this.FramePending.length - 1; index++) {
    if (this.FramePending[index]) {
      return false;
    }
  }
  if (this.Frames.length === 0) {
    return roots === 0;
  }
  return roots === 1;
}
for (const pending of this.FramePending) {
  if (pending) {
    return false;
  }
}
if (this.Prefixes.length > 0) {
  return false;
}
return roots === 1;
```

## method Fail:(reason:string)=>void

```ts
// 显式 Decline（范围外构造 / 不完整）：只置位 + 记原因，**不抛**；strict 由 session 在 Decline 时统一处理。
this.Declined = true;
this.Reason = reason;
DirectBuildMetrics.Trace("engine-decline: " + reason);
```

## private method IngestOperand:(unit:Token, text:string, pos:int)=>void

```ts
if (unit instanceof Common) {
  const common = unit as Common;
  if (DirectTokenUtil.StartsNumber(text)) {
    if (!common.IsNumber()) {
      this.Fail("数值字面量不在本轮范围（BigInt / 数值后缀）: " + text);
      return;
    }
    const numeric = NumericLiteralShape.FromBasicToken(common, this.Context);
    numeric.Pos = pos;
    this.PendingOperand = numeric;
    this.Expect = DirectExpressionEngine.ExpectOperator;
    return;
  }
  if (DirectTokenUtil.IsIdentifierOperand(unit)) {
    const identifier = IdentifierShape.FromBasicToken(common, this.Context);
    identifier.Pos = pos;
    this.PendingOperand = identifier;
    this.Expect = DirectExpressionEngine.ExpectOperator;
    return;
  }
  this.Fail("字面量 / 关键字不在本轮范围: " + text);
  return;
}
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar !== "(") {
    this.Fail("数组 / 对象字面量不在本轮范围");
    return;
  }
  // 括号 = 嵌套引擎（DESIGN §4.3）：`bracket.Data` 里没有两侧括号本身，内层用 `(` 之后的位置作 BasePos。
  const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
  const inner = new DirectExpressionEngine(this.Template, this.Context, base);
  inner.IngestAll(bracket.Data);
  if (inner.Declined) {
    this.Fail("括号内表达式：" + inner.Reason);
    return;
  }
  if (inner.Held) {
    this.Fail("括号内表达式没有读完");
    return;
  }
  const value = inner.Finish();
  if (value === null) {
    this.Fail("括号内表达式不完整");
    return;
  }
  // 括号节点区间含两侧括号（Pos 仍按 unitPos，含 `(` 前的 trivia）。
  const paren = new ParenthesizedExpressionShape(this.Template);
  paren.Add(value);
  if (bracket.SourceRange.StartIndex >= 0) {
    paren.SignIn(bracket.SourceRange.StartIndex);
  }
  if (bracket.SourceRange.EndIndex >= 0) {
    paren.SignOut(bracket.SourceRange.EndIndex);
  }
  paren.Pos = pos;
  paren.TryToClose(this.Context);
  this.PendingOperand = paren;
  this.Expect = DirectExpressionEngine.ExpectOperator;
  return;
}
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  // 本轮只做这六个前缀：typeof / void / delete 是范围外（D2 / §1.2），不在这里偷做。
  const supported = text === "!" || text === "~" || text === "+" || text === "-"
    || text === "++" || text === "--";
  if (!supported || !OperatorTable.IsPrefixOperator(text)) {
    this.Fail("操作数位置上的符号不在本轮范围: " + (text === "" ? "符号" : text));
    return;
  }
  const prefix = new PrefixUnaryExpressionShape(this.Template);
  if (symbol.SourceRange.StartIndex >= 0) {
    prefix.SignIn(symbol.SourceRange.StartIndex);
  }
  prefix.Pos = pos;
  // 运算符 token 只做字段、不进 Data（TS 的 PrefixUnaryExpression children 只有 operand）。
  (prefix as any).OperatorToken = unit;
  this.Prefixes.push(prefix);
  this.Expect = DirectExpressionEngine.ExpectOperand;
  return;
}
this.Fail("操作数位置上的单元不在本轮范围");
```

## private method IngestOperator:(unit:Token, text:string, pos:int)=>void

```ts
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  if (text === "++" || text === "--") {
    this.IngestPostfix(unit, pos);
    return;
  }
  if (OperatorTable.IsBinaryOperator(text)) {
    this.IngestBinary(unit, text, pos);
    return;
  }
  // 本层结束符：`FlushOperand + CompleteAllFrames`，干净收口（不 Held 不 Fail；`;` / `,` 由 session 处理）。
  if (text === "," || text === ";" || text === ")" || text === "]" || text === "}") {
    this.EndLayer();
    return;
  }
  this.Fail("表达式运算符不在本轮范围: " + (text === "" ? "符号" : text));
  return;
}
if (unit instanceof Common) {
  if (OperatorTable.IsBinaryOperator(text)) {
    // `instanceof` / `in` 是 Common 形态的二元运算符（与 ExpressionBuilder.BinaryOperatorText 同判据）。
    this.IngestBinary(unit, text, pos);
    return;
  }
  if (OperatorTable.IsAsOperator(text)) {
    this.Fail("类型断言不在本轮范围: " + text);
    return;
  }
  // 接不上的单元**不是** Fail：它可能是下一条语句的首单元 / ASI leftover（DESIGN §4.6）。
  this.Hold();
  return;
}
if (unit instanceof Bracket) {
  // 操作数后面的 `(` / `[` / `{` 只能是调用 / 下标 / 块：全在本轮范围外（R5）。
  this.Fail("调用 / 下标不在本轮范围");
  return;
}
this.Hold();
```

## private method IngestBinary:(unit:Token, text:string, pos:int)=>void

```ts
this.FlushOperand();
this.PushOperator(unit, text, OperatorTable.Precedence(text), OperatorTable.IsRightAssociative(text), pos);
```

## private method PushOperator:(unit:Token, text:string, precedence:int, rightAssoc:bool, pos:int)=>void

```ts
// 1) 收掉栈上所有「优先级更高（或同级左结合）」的完整 frame。
while (this.Frames.length > 0 && !this.FramePending[this.FramePending.length - 1]) {
  const topPrecedence = this.FramePrecs[this.FramePrecs.length - 1];
  if (topPrecedence > precedence || (topPrecedence === precedence && !rightAssoc)) {
    this.CompleteTop();
    continue;
  }
  break;
}
// 2) 把新运算符节点插到「当前容器最后一个子节点」与其父级之间。
const parent = this.Top();
if (parent === null || parent.Data.length === 0) {
  this.Fail("二元运算符缺少左操作数: " + text);
  return;
}
const child = parent.Data[parent.Data.length - 1];
const shape = new BinaryExpressionShape(this.Template);
ShapeInsertUtil.InsertBetween(parent, child, shape);
shape.Add(DirectTokenUtil.OperatorToken(unit, pos, this.Template, this.Context));
this.Inserts += 1;
this.Frames.push(shape);
this.FramePrecs.push(precedence);
this.FramePending.push(true);
this.Expect = DirectExpressionEngine.ExpectOperand;
DirectBuildMetrics.Trace("insert(" + text + ") prec" + precedence + " owner=" + (parent === this.Root ? "Holder" : parent.constructor.name));
```

## private method IngestPostfix:(unit:Token, pos:int)=>void

```ts
const operand = this.PendingOperand;
if (operand === null) {
  this.Fail("后缀运算符缺少操作数: " + DirectTokenUtil.TextOf(unit));
  return;
}
// 后缀比前缀绑得紧：这里只替换 `PendingOperand`（`-a++` = `-(a++)`），前缀留到 FlushOperand 再包。
const shape = new PostfixUnaryExpressionShape(this.Template);
shape.Add(operand);
if (operand instanceof ShapeToken) {
  shape.Pos = (operand as ShapeToken).Pos;
}
if (operand.SourceRange.StartIndex >= 0) {
  shape.SignIn(operand.SourceRange.StartIndex);
}
if (unit.SourceRange.EndIndex >= 0) {
  shape.SignOut(unit.SourceRange.EndIndex);
}
// 运算符 token 只做字段、不进 Data（TS 的 PostfixUnaryExpression children 只有 operand）。
(shape as any).OperatorToken = unit;
shape.TryToClose(this.Context);
this.PendingOperand = shape;
this.Expect = DirectExpressionEngine.ExpectOperator;
```

## private method EndLayer:()=>void

```ts
this.FlushOperand();
this.CompleteAllFrames();
this.LayerEnded = true;
```

## private method Hold:()=>void

```ts
this.Held = true;
this.HeldAt = this.Ingested;
```

## private method FlushOperand:()=>void

```ts
const pending = this.PendingOperand;
if (pending === null) {
  return;
}
this.PendingOperand = null;
let operand = pending;
// 前缀在操作数外：`-a` 是 Prefix(-)[a]；多个前缀按「后进先内」包（`--!a` = --(!a)）。
while (this.Prefixes.length > 0) {
  const prefix = this.Prefixes.pop()!;
  prefix.Add(operand);
  if (operand.SourceRange.EndIndex >= 0) {
    prefix.SignOut(operand.SourceRange.EndIndex);
  }
  prefix.TryToClose(this.Context);
  operand = prefix;
}
this.AttachOperand(operand);
```

## private method AttachOperand:(operand:Token)=>void

```ts
if (this.Frames.length > 0 && this.FramePending[this.FramePending.length - 1]) {
  const frame = this.Frames[this.Frames.length - 1];
  frame.Add(operand);
  this.FramePending[this.FramePending.length - 1] = false;
  // end **不在这里封**：右操作数若是更高优先级/右结合的子树（`a+b*c` 的 `*`、`a**b**c` 的内层 `**`），
  // 它外层 frame 的终点必须取「最终最后一个子节点的终点」；在 CompleteTop 出栈时统一封一次（R2：
  // SignOut 只能赋值一次，所以只能封在最外层结构定稿的那一刻）。
  return;
}
const top = this.Top();
if (top === null) {
  this.Fail("表达式没有容器");
  return;
}
top.Add(operand);
```

## private method Top:()=>Token | null

```ts
if (this.Frames.length > 0) {
  return this.Frames[this.Frames.length - 1];
}
return this.Root;
```

## private method CompleteTop:()=>void

```ts
// 出栈前封终点 + 关闭：终点取「最后一个子节点的 EndIndex」——它此刻已经定稿（叶子/括号/前缀/后缀
// 在挂上时封，内层 frame 在更早出栈时封）。这比「右操作数挂上就封」晚一步，正是 `a+b*c` / `a**b**c`
// 外层节点 end 正确的唯一做法（SignOut 只能赋值一次，DESIGN §4.4 / R2）。
const frame = this.Frames[this.Frames.length - 1];
if (frame.SourceRange.EndIndex < 0 && frame.Data.length > 0) {
  const last = frame.Data[frame.Data.length - 1];
  if (last.SourceRange.EndIndex >= 0) {
    frame.SignOut(last.SourceRange.EndIndex);
  }
}
if (frame.SourceRange.EndIndex >= 0) {
  frame.TryToClose(this.Context);
}
this.Frames.pop();
this.FramePrecs.pop();
this.FramePending.pop();
```

## private method CompleteAllFrames:()=>void

```ts
while (this.Frames.length > 0) {
  this.CompleteTop();
}
```
