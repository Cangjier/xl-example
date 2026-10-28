# dependencies
```xl
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { ComputePossibleShapesStates } from "../../../../../core/syntax/compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../../../../../core/syntax/i-compute-possible-shapes.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { DeclarationAsiBoundary } from "../../../declarations/forms/declaration-asi-boundary.xl.md"
import { StatementScanner } from "../../../statements/statement-scanner.xl.md"
import { EndOfFileTokenShape } from "../../../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { EqualsGreaterThanTokenShape } from "../../../punctuation/equals-greater-than-token-shape.xl.md"
import { ParameterShape } from "../../../types/parameter-shape.xl.md"
import { ArrowParamsCatalog } from "./arrow-params-catalog.xl.md"
import { ArrowFunctionShape } from "../../arrow-function-shape.xl.md"
import { IncrementalItemPosition, NumericLiteralPossibleShape } from "../../numeric-literal-possible-shape.xl.md"
import { OperatorTable } from "../../operator-table.xl.md"
import { BinaryOperatorPossibleShape } from "../operator/binary-operator-possible-shape.xl.md"
import { ReassociationPossibleShape } from "../operator/reassociation-possible-shape.xl.md"
import { ConditionalPossibleShape } from "../operator/conditional-possible-shape.xl.md"
import { AssignmentPossibleShape } from "../operator/assignment-possible-shape.xl.md"
```

# namespace cangjie

# class ArrowPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new ArrowPossibleShape());
```

## static method RawAfter:(unit:Token, length:int)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
let text = "";
const count = document.GetCount();
let at = range.EndIndex;
while (at < count && text.length < length) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  text += ch;
  at += 1;
}
return text;
```

## static method IsIdentifierWord:(unit:Token)=>bool

```ts
if (unit instanceof IdentifierShape) {
  return true;
}
if (!(unit instanceof Common)) {
  return false;
}
const common = unit as Common;
if (common.IsBigInt() || common.IsNumber()) {
  return false;
}
if (common.IsAny(["true", "false", "null", "this", "in", "instanceof"])) {
  return false;
}
return common.TempToString().length > 0;
```

## static method LooksLikeArrowAfter:(unit:Token)=>bool

```ts
const pair = ArrowPossibleShape.RawAfter(unit, 2);
return pair.length >= 2 && pair[0] === "=" && pair[1] === ">";
```

## static method BodyStartsBracket:(arrowUnit:Token)=>bool

```ts
const next = ArrowPossibleShape.RawAfter(arrowUnit, 1);
if (next.length === 0) {
  return false;
}
return next === "(" || next === "[";
```

## static method IsNestedArrowHead:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !(unit as Symbol).Is("=>")) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
return ArrowParamsCatalog.IsPendingArrowParen(units[previous]);
```

## static method IsInitializerHead:(units:Array<Token>, tokenIndex:int)=>bool

```ts
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
const unit = units[previous];
return unit instanceof Symbol && (unit as Symbol).Is("=");
```

## static method BodyNotIncremental:(arrowUnit:Token)=>bool

```ts
const text = ArrowPossibleShape.RawAfter(arrowUnit, 12);
if (text.length === 0) {
  return false;
}
const first = text[0];
if (first === "{") {
  return false;
}
if (first >= "0" && first <= "9") {
  return false;
}
const isWordStart = (first >= "a" && first <= "z") || (first >= "A" && first <= "Z")
  || first === "_" || first === "$";
if (!isWordStart) {
  return true;
}
let end = 0;
while (end < text.length) {
  const ch = text[end];
  const isWordChar = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$";
  if (!isWordChar) {
    break;
  }
  end += 1;
}
const word = text.substring(0, end);
if (word === "true" || word === "false" || word === "null") {
  return false;
}
return StatementScanner.IsReservedWord(word);
```

## static method IsArrowHead:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Symbol) || !(unit as Symbol).Is("=>")) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return false;
}
if (!ArrowPossibleShape.IsIdentifierWord(units[previous])) {
  return false;
}
return ArrowPossibleShape.IsInitializerHead(units, previous)
  || ArrowPossibleShape.IsArrowBodyHead(units, previous);
```

## static method IsArrowBodyHead:(units:Array<Token>, index:int)=>bool

```ts
const previous = ItemUtil.PreviousCode(units, index - 1);
if (previous < 0) {
  return false;
}
return units[previous] instanceof EqualsGreaterThanTokenShape;
```

## static method KeepBodyOpen:(unit:Token)=>bool

```ts
const next = DeclarationAsiBoundary.NextCodeChar(unit);
if (next === "") {
  return false;
}
if (next === ";" || next === "," || next === ")" || next === "]" || next === "}") {
  return false;
}
return !DeclarationAsiBoundary.StartsNewStatementLine(unit);
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
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === "=") {
    return ShapeStates.Uncertain;
  }
  if (text === "=>") {
    if (!ArrowPossibleShape.IsArrowHead(units, tokenIndex)) {
      return ShapeStates.Reject;
    }
    // [B4g] 体是 `(` / `[` 的箭头不在增量里建（见 `BodyStartsBracket`）：这一格保持 `Uncertain`，
    // 整条初始化器留在 raw basic，收口格原子建树时再让箭头形参 `(` 的 Deferred 条目 Bind。
    // [R7] 体首是本目录建不了的形态（前缀运算符 / 字符串 / 保留关键字）时同样不建，交回 legacy。
    return ArrowPossibleShape.BodyNotIncremental(unit) ? ShapeStates.Uncertain : ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (unit instanceof Common) {
  // 参数格：只有「初始化器首位 + 单标识符 + 文档前瞻命中 `=>`」才保持在场；其余格让给 A1/A2/P6 赋值。
  if (!ArrowPossibleShape.IsIdentifierWord(unit)) {
    return ShapeStates.Reject;
  }
  if (!ArrowPossibleShape.IsInitializerHead(units, tokenIndex)) {
    return ShapeStates.Reject;
  }
  return ArrowPossibleShape.LooksLikeArrowAfter(unit) ? ShapeStates.Uncertain : ShapeStates.Reject;
}
return ShapeStates.Reject;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
return ArrowPossibleShape.IsArrowHead(units, tokenIndex)
  || ArrowPossibleShape.IsNestedArrowHead(units, tokenIndex);
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
if (!ArrowPossibleShape.IsArrowHead(units, tokenIndex)) {
  return false;
}
// [B4g] 体是括号的箭头不建（见 `BodyStartsBracket`）：判据与 `ComputeByIndex` 同一份，跨步稳定。
// [R7] 体首是前缀运算符 / 字符串 / 保留关键字时也不建（见 `BodyNotIncremental`）。
return !ArrowPossibleShape.BodyNotIncremental(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const data = host.Data;
const arrowAt = tokenIndex;
if (arrowAt < 0 || arrowAt >= data.length) {
  throw new Error("增量变量形状未支持：expression 箭头缺 =>");
}
const arrowUnit = data[arrowAt];
if (!(arrowUnit instanceof Symbol) || !(arrowUnit as Symbol).Is("=>")) {
  throw new Error("增量变量形状未支持：expression 箭头符号");
}
const previous = ItemUtil.PreviousCode(data, arrowAt - 1);
if (previous < 0) {
  throw new Error("增量变量形状未支持：expression 箭头缺参数");
}
// [R7:TRIVIA] 参数与 `=>` 之间的空白 / 注释属于箭头自己的 `Data`（参数之后、`=>` 之前）：
// 留在宿主里会落在箭头**后面**，树里顺序与源码相反（step 14 的 `WrapSymbol [11,12)`）。
// 这里只读不摘——下面两次 splice 之后再按身份把它们从宿主里摘掉。
const trivia = ItemUtil.TriviaBetween(data, previous, arrowAt);
const parameterUnit = data[previous];
let identifier: ShapeToken;
if (parameterUnit instanceof IdentifierShape) {
  identifier = parameterUnit as IdentifierShape;
} else if (parameterUnit instanceof Common) {
  if (!ArrowPossibleShape.IsIdentifierWord(parameterUnit)) {
    throw new Error("增量变量形状未支持：expression 箭头参数");
  }
  const shape = IdentifierShape.FromBasicToken(parameterUnit as Common, context);
  shape.Pos = IncrementalItemPosition.AfterPreviousCode(data, previous);
  (parameterUnit as Common).Replace(shape);
  identifier = shape;
} else {
  throw new Error("增量变量形状未支持：expression 箭头参数");
}
const parameter = new ParameterShape(host.Template);
if (identifier.SourceRange.Start >= 0) {
  parameter.SignIn(identifier.SourceRange.Start);
}
if (identifier.SourceRange.End >= 0) {
  parameter.SignOut(identifier.SourceRange.End);
}
parameter.Pos = identifier.Pos;
parameter.Add(identifier);
parameter.TryToClose(context);
const arrowToken = new EqualsGreaterThanTokenShape(host.Template);
if (arrowUnit.SourceRange.Start >= 0) {
  arrowToken.SignIn(arrowUnit.SourceRange.Start);
}
if (arrowUnit.SourceRange.End >= 0) {
  arrowToken.SignOut(arrowUnit.SourceRange.End);
}
arrowToken.Pos = IncrementalItemPosition.AfterPreviousCode(data, arrowAt);
arrowToken.TryToClose(context);
const arrow = new ArrowFunctionShape(host.Template);
if (parameter.SourceRange.Start >= 0) {
  arrow.SignIn(parameter.SourceRange.Start);
}
arrow.Pos = parameter.Pos;
arrow.Add(parameter);
ItemUtil.InsertTrivia(arrow, 1, trivia);
arrow.Add(arrowToken);
data.splice(arrowAt, 1);
data.splice(previous, 1, arrow);
for (const unit of trivia) {
  const at = data.indexOf(unit);
  if (at >= 0) {
    data.splice(at, 1);
  }
}
arrow.Parent = host;
host.MountedUnit = arrow;
arrow.CatalogGuide = new CatalogGuide(ArrowBodyPossibleShape.Catalog(), new ArrowBodyEndPossibleShape());
return arrow;
```

# class ArrowBodyPossibleShape extends PossibleShape

## static method Catalog:()=>Array<PossibleShape>

```ts
const shapes:Array<PossibleShape> = [];
shapes.push(new ArrowBodyPossibleShape());
shapes.push(new ArrowBodyBinaryPossibleShape());
shapes.push(new ArrowBodyConditionalPossibleShape());
shapes.push(new ArrowBodyAssignmentPossibleShape());
shapes.push(new ArrowPossibleShape());
return shapes;
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
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
return units[previous] instanceof EqualsGreaterThanTokenShape ? ShapeStates.Accept : ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ArrowFunctionShape)) {
  throw new Error("增量变量形状未支持：expression 箭头体宿主不是箭头函数");
}
const arrow = host as ArrowFunctionShape;
const data = arrow.Data;
if (tokenIndex < 0 || tokenIndex >= data.length) {
  throw new Error("增量变量形状未支持：expression 箭头体");
}
// trivia（`=>` 之后的空白）不属 legacy 的 `ArrowFunctionShape.Data`（它的子单元就是参数 / `=>` / 体），
// 留在形状里会变成增量树多出来的 basic 行。建之前从形状里摘掉：与 `ConditionalMemberPossibleShape`
// 对 trivia 的处理同一口径。
const current = data[tokenIndex];
for (let scan = data.length - 1; scan >= 0; scan--) {
  if (data[scan].IsTriviaToken) {
    data.splice(scan, 1);
  }
}
const at = data.indexOf(current);
if (at < 0) {
  throw new Error("增量变量形状未支持：expression 箭头体");
}
const unit = data[at];
if (!(unit instanceof Common)) {
  throw new Error("增量变量形状未支持：expression 箭头体");
}
// 体首原子：标识符 / 数字 / bigint / 关键字字面量都走同一个物化入口（与二元左操作数同一份），
// `Pos` 按 C1（前一个非 trivia 代码单元的 `EndIndex`，即 `=>` 的终点）。
const body = BinaryOperatorPossibleShape.Operand(arrow, at, context);
// [R7] 箭头保持 open：只有「体到此为止」的形态（EOF / 收口符 / 换行 ASI）才在这里封口 + 卸载。
if (!ArrowPossibleShape.KeepBodyOpen(unit)) {
  arrow.TryToClose(context);
  if (arrow.Parent !== null && arrow.Parent.MountedUnit === arrow) {
    arrow.Quit();
  }
}
return body;
```

# class ArrowBodyBinaryPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const text = BinaryOperatorPossibleShape.TextOf(unit);
// `=` 是赋值（`ArrowBodyAssignmentPossibleShape`），不是二元运算符。
if (text === "" || text === "=") {
  return ShapeStates.Reject;
}
if (!OperatorTable.IsBinaryOperator(text)) {
  return ShapeStates.Reject;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return ShapeStates.Reject;
}
const left = units[leftIndex];
if (!(left instanceof ShapeToken) && !(left instanceof Common)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ArrowFunctionShape)) {
  throw new Error("增量变量形状未支持：expression 箭头体二元宿主不是箭头函数");
}
return new ReassociationPossibleShape().BuildByIndex(host, tokenIndex, catalog, context);
```

# class ArrowBodyConditionalPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (!ConditionalPossibleShape.IsQuestionSymbol(unit)) {
  return ShapeStates.Reject;
}
const leftIndex = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (leftIndex < 0) {
  return ShapeStates.Reject;
}
const left = units[leftIndex];
if (!(left instanceof ShapeToken) && !(left instanceof Common)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ArrowFunctionShape)) {
  throw new Error("增量变量形状未支持：expression 箭头体三目宿主不是箭头函数");
}
const conditional = new ConditionalPossibleShape();
return conditional.BuildByIndex(host, tokenIndex, catalog, context);
```

# class ArrowBodyAssignmentPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol) {
  if ((unit as Symbol).Is("=") && AssignmentPossibleShape.IsBodyAssignmentEqualAt(units, tokenIndex)) {
    return ShapeStates.Uncertain;
  }
  return ShapeStates.Reject;
}
if (!(unit instanceof Common)) {
  return ShapeStates.Reject;
}
const equalAt = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (equalAt < 0) {
  return ShapeStates.Reject;
}
if (!AssignmentPossibleShape.IsBodyAssignmentEqualAt(units, equalAt)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ArrowFunctionShape)) {
  throw new Error("增量变量形状未支持：expression 箭头体赋值宿主不是箭头函数");
}
return new AssignmentPossibleShape().BuildByIndex(host, tokenIndex, catalog, context, true);
```

# class ArrowBodyEndPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Reject;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken || unit instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === ";" || text === "," || text === ")" || text === "]" || text === "}") {
    return ShapeStates.Accept;
  }
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ArrowFunctionShape)) {
  throw new Error("增量变量形状未支持：expression 箭头终结宿主不是箭头函数");
}
const arrow = host as ArrowFunctionShape;
const data = arrow.Data;
if (tokenIndex < 0 || tokenIndex >= data.length) {
  throw new Error("增量变量形状未支持：expression 箭头终结");
}
const current = data[tokenIndex];
// 尾随 trivia 不是箭头的 AST 子节点，也不参与终点：先摘掉（与体原子建树同一口径）。
for (let scan = data.length - 1; scan >= 0; scan--) {
  if (data[scan].IsTriviaToken) {
    data.splice(scan, 1);
  }
}
const at = data.indexOf(current);
if (at < 0) {
  throw new Error("增量变量形状未支持：expression 箭头终结");
}
const delimiter = data[at];
// 先封口 + 卸载，再把收口符从箭头的 `Data` 里摘出来交还父层（源码顺序：箭头之后）。
arrow.TryToClose(context);
const parent = arrow.Parent;
if (parent !== null && parent.MountedUnit === arrow) {
  arrow.Quit();
}
data.splice(at, 1);
if (parent !== null) {
  const arrowAt = parent.Data.indexOf(arrow);
  if (arrowAt >= 0) {
    delimiter.Parent = parent;
    parent.Data.splice(arrowAt + 1, 0, delimiter);
  }
  if ("ComputePossibleShapes" in parent) {
    (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  }
}
return delimiter;
```
