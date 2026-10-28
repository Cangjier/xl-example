# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { MemberChainJudge } from "../postfix/member-chain-judge.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
```

# namespace cangjie

```text
let x = y++                     let x = ++y
VariableDeclarationShape        VariableDeclarationShape
├─ IdentifierShape pos=3       ├─ IdentifierShape pos=3
└─ PostfixUnaryExpressionShape └─ PrefixUnaryExpressionShape
   pos=7  src=[8,11)              pos=7  src=[8,11)
   └─ IdentifierShape             └─ IdentifierShape
      pos=7  src=[8,9)  text="y"     pos=10  src=[10,11)  text="y"
```

# class UpdateExpressionPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new UpdateExpressionPossibleShape());
```

## static field UpdateTexts:Array<string> = ["++", "--"]

## static field KindPrefix:string = "pre"

## static field KindPostfix:string = "post"

## static method IsUpdateText:(text:string)=>bool

```ts
return text === "++" || text === "--";
```

## static method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method IsUpdateSymbol:(unit:Token)=>bool

```ts
return UpdateExpressionPossibleShape.IsUpdateText(UpdateExpressionPossibleShape.TextOf(unit));
```

## static method PostfixPreview:(head:Token)=>bool

```ts
const range = head.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t") {
    at += 1;
    continue;
  }
  break;
}
if (at + 1 >= count) {
  return false;
}
const first = document.GetValue(at);
if (first !== "+" && first !== "-") {
  return false;
}
return document.GetValue(at + 1) === first;
```

## static method Kind:(units:Array<Token>)=>string

```ts
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return "";
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt < 0) {
  return "";
}
const head = units[headAt];
if (head instanceof Symbol) {
  const text = (head as Symbol).TempToString();
  if (UpdateExpressionPossibleShape.IsUpdateText(text)) {
    return UpdateExpressionPossibleShape.KindPrefix;
  }
  return "";
}
if (!(head instanceof Common)) {
  return "";
}
if (!MemberChainJudge.HeadAllowed(head)) {
  return "";
}
const suffixAt = MemberChainJudge.FirstSignificant(units, headAt + 1);
if (suffixAt < 0) {
  if (UpdateExpressionPossibleShape.PostfixPreview(head)) {
    return UpdateExpressionPossibleShape.KindPostfix;
  }
  return "";
}
const suffix = units[suffixAt];
if (UpdateExpressionPossibleShape.IsUpdateSymbol(suffix)) {
  return UpdateExpressionPossibleShape.KindPostfix;
}
return "";
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

```ts
const kind = UpdateExpressionPossibleShape.Kind(units);
if (kind === "") {
  return false;
}
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const last = MemberChainJudge.LastSignificant(units);
if (last <= equalAt) {
  return false;
}
// [D0:TAIL] 「之后只剩输入结束」的唯一判据（跳过 trivia、允许 `;`）。
if (!InitializerTailJudge.IsInitializerEnd(units, last)) {
  return false;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  raw.push(units[at]);
}
if (raw.length === 0) {
  return false;
}
const equalUnit = units[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const builder = new ExpressionBuilder(template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
try {
  builder.ParseExpression();
} catch (error) {
  return false;
}
return builder.At === builder.Units.length;
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
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (UpdateExpressionPossibleShape.Kind(units) !== "") {
  return ShapeStates.Uncertain;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
return UpdateExpressionPossibleShape.CanBuild(units, context.Root.Template, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const equalAt = MemberChainJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：expression update 缺赋值符");
}
const equalUnit = host.Data[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < host.Data.length; at++) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  raw.push(host.Data[at]);
}
if (raw.length === 0) {
  throw new Error("增量变量形状未支持：expression update 没有操作数");
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression update 未读完");
}
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, expression);
expression.Parent = host;
host.MountedUnit = null;
return expression;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!UpdateExpressionPossibleShape.IsUpdateSymbol(unit)) {
  return false;
}
return UpdateExpressionPossibleShape.Kind(units) !== "";
```
