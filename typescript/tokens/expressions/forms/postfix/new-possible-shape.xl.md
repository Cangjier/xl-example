# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { IncrementalItemPosition } from "../../numeric-literal-possible-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { NewExpressionShape } from "../../new-expression-shape.xl.md"
import { ParenthesizedExpressionShape } from "../../parenthesized-expression-shape.xl.md"
import { CompositeInitializerFormsJudge } from "../primary/composite-initializer-forms-judge.xl.md"
import { ExpressionAtomRegistry } from "../shared/expression-atom-registry.xl.md"
```

# namespace cangjie

# class NewPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new NewPossibleShape());
```

## static method EqualIndex:(units:Array<Token>)=>int

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return at;
  }
}
return -1;
```

## static method IsNewItem:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const equalAt = NewPossibleShape.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const head = ItemUtil.NextCode(units, equalAt + 1);
if (head < 0 || head >= units.length) {
  return false;
}
const unit = units[head];
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "new";
```

## static method IsNewKeywordHead:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Common) || (unit as Common).TempToString() !== "new") {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const left = units[previous];
return left instanceof Symbol && (left as Symbol).Is("=");
```

## static method IsCalleeCell:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const left = units[previous];
if (!(left instanceof Common)) {
  return false;
}
if ((left as Common).TempToString() !== "new") {
  return false;
}
return NewPossibleShape.IsNewItem(units, tokenIndex);
```

## static method IsCalleeGroup:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const left = units[previous];
if (!(left instanceof Common)) {
  return false;
}
if ((left as Common).TempToString() !== "new") {
  return false;
}
return NewPossibleShape.IsNewItem(units, tokenIndex);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar !== "(") {
    return ShapeStates.Reject;
  }
  return NewPossibleShape.IsNewItem(units, tokenIndex) ? ShapeStates.Accept : ShapeStates.Reject;
}
if (NewPossibleShape.IsNewKeywordHead(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (NewPossibleShape.IsCalleeCell(units, tokenIndex)) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket)) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "(") {
  return false;
}
return NewPossibleShape.IsNewItem(units, tokenIndex);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar !== "(") {
    return false;
  }
  const bracket = unit as Bracket;
  if (!bracket.Closed && bracket.SourceRange.EndIndex < 0) {
    return false;
  }
  if (!NewPossibleShape.IsNewItem(units, tokenIndex)) {
    return false;
  }
  // [T14:NEW-CALLEE-GROUP] `new (…)` 的括号组不是实参括号：不在这一格建树，
  // 让候选活到后面那只实参括号（`new (E)(…)`）；后面什么都不接时才是完整的 `new (E)`。
  if (NewPossibleShape.IsCalleeGroup(units, tokenIndex)) {
    const lookahead = CompositeInitializerFormsJudge.NextSignificantChar(unit);
    return lookahead === "" || lookahead === ";";
  }
  return true;
}
if (!NewPossibleShape.IsCalleeCell(units, tokenIndex)) {
  return false;
}
const lookahead = CompositeInitializerFormsJudge.NextSignificantChar(unit);
return lookahead === "" || lookahead === ";";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const data = host.Data;
const unit = data[tokenIndex];
let calleeIndex = -1;
let endIndex = -1;
let bracket:Bracket | null = null;
if (unit instanceof Bracket) {
  if ((unit as Bracket).StartBracketChar !== "(") {
    throw new Error("增量变量形状未支持：expression new 括号");
  }
  endIndex = (unit as Bracket).SourceRange.EndIndex;
  // [T14:NEW-CALLEE-GROUP] 紧跟 `new` 的括号是**括号组被构造者**（`new (E)`，没有实参括号）：
  // 它自己既是被构造者、也是整棵形态的终点；否则这一格是 `NewExpressionShape` 的实参括号，
  // 被构造者是它前面那个代码单元（可能是标识符，也可能是括号组）。
  if (NewPossibleShape.IsCalleeGroup(data, tokenIndex)) {
    calleeIndex = tokenIndex;
  } else {
    bracket = unit as Bracket;
    calleeIndex = ItemUtil.PreviousCode(data, tokenIndex - 1);
  }
} else if (unit instanceof Common) {
  calleeIndex = tokenIndex;
  endIndex = unit.SourceRange.EndIndex;
} else {
  throw new Error("增量变量形状未支持：expression new 被构造者");
}
if (calleeIndex < 0) {
  throw new Error("增量变量形状未支持：expression new 缺被构造者");
}
const newIndex = ItemUtil.PreviousCode(data, calleeIndex - 1);
if (newIndex < 0) {
  throw new Error("增量变量形状未支持：expression new 缺关键字");
}
const newUnit = data[newIndex];
if (!(newUnit instanceof Common) || (newUnit as Common).TempToString() !== "new") {
  throw new Error("增量变量形状未支持：expression new 关键字");
}
if (endIndex < 0) {
  throw new Error("增量变量形状未支持：expression new 没有终点");
}
const callee = NewPossibleShape.Operand(host, calleeIndex, context);
let args:Array<Token> = [];
if (bracket !== null) {
  const builder = new ExpressionBuilder(host.Template, context);
  args = builder.ParseBracketArguments(bracket);
}
const shape = new NewExpressionShape(host.Template);
shape.Add(callee);
for (const arg of args) {
  shape.Add(arg);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(data, newIndex);
const start = newUnit.SourceRange.StartIndex;
if (start < 0) {
  throw new Error("增量变量形状未支持：expression new 关键字没有起点");
}
shape.SignIn(start);
shape.SignOut(endIndex);
shape.TryToClose(context);
// [T13:NEW-POSTFIX] 只登记「增量候选自己建出的 new 形状」：收口格据此把它当操作数消费（`HasNode`），
// 后缀由 legacy `ExpressionBuilder.ParsePostfixSuffix` 接上。
ExpressionAtomRegistry.RegisterNode(shape);
data.splice(newIndex, tokenIndex - newIndex + 1, shape);
shape.Parent = host;
host.MountedUnit = null;
return shape;
```

## static method Operand:(host:Token, index:int, context:SyntaxContext)=>Token

```ts
const unit = host.Data[index];
if (unit instanceof ShapeToken) {
  return unit;
}
if (unit instanceof Bracket) {
  // [T14:NEW-CALLEE-GROUP] 括号组被构造者：括号里的整棵表达式交给 legacy `ExpressionBuilder`，
  // 与 legacy「`new (E)`」的树（`ParseNew` → `ParsePrimary` 括号分支）同源。
  return NewPossibleShape.CalleeGroup(host, index, context);
}
if (!(unit instanceof Common)) {
  throw new Error("增量变量形状未支持：expression new 被构造者");
}
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
(unit as Common).Replace(identifier);
return identifier;
```

## static method CalleeGroup:(host:Token, index:int, context:SyntaxContext)=>Token

```ts
const unit = host.Data[index];
if (!(unit instanceof Bracket)) {
  throw new Error("增量变量形状未支持：expression new 括号被构造者");
}
const bracket = unit as Bracket;
const raw:Array<Token> = [];
for (const child of bracket.Data) {
  if (child.IsTriviaToken) {
    continue;
  }
  raw.push(child);
}
if (raw.length === 0) {
  throw new Error("增量变量形状未支持：expression new 空括号被构造者");
}
let basePos = bracket.SourceRange.Start + 1;
if (basePos < 0) {
  basePos = 0;
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos);
const inner = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression new 括号被构造者未读完");
}
const shape = new ParenthesizedExpressionShape(host.Template);
if (bracket.SourceRange.Start >= 0) {
  shape.SignIn(bracket.SourceRange.Start);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, index);
shape.Add(inner);
if (bracket.SourceRange.End >= 0) {
  shape.SignOut(bracket.SourceRange.End);
}
if (shape.SourceRange.End < 0) {
  shape.TryToClose(context);
}
shape.Closed = true;
bracket.Replace(shape);
return shape;
```
