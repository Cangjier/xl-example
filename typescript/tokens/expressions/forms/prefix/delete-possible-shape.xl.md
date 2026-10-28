# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
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
let x = delete o.p
VariableDeclarationShape  pos=3  src=[4,18)
├─ IdentifierShape  pos=3  src=[4,5)  text="x"
└─ DeleteExpressionShape  pos=7  src=[8,18)
   └─ PropertyAccessExpressionShape  pos=14  src=[15,18)
      ├─ IdentifierShape  pos=14  src=[15,16)  text="o"
      └─ IdentifierShape  pos=17  src=[17,18)  text="p"
```

# class DeletePossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

```ts
shapes.push(new DeletePossibleShape());
```

## static field KindDelete:string = "delete"

## static method IsDeleteHead:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "delete";
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
if (!DeletePossibleShape.IsDeleteHead(units[headAt])) {
  return "";
}
return DeletePossibleShape.KindDelete;
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

```ts
if (DeletePossibleShape.Kind(units) === "") {
  return false;
}
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt < 0) {
  return false;
}
const operandAt = MemberChainJudge.FirstSignificant(units, headAt + 1);
if (operandAt < 0) {
  return false;
}
const last = MemberChainJudge.LastSignificant(units);
if (last <= operandAt) {
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
if (DeletePossibleShape.Kind(units) !== "") {
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
return DeletePossibleShape.CanBuild(units, context.Root.Template, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const equalAt = MemberChainJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：expression delete 缺赋值符");
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
  throw new Error("增量变量形状未支持：expression delete 没有操作数");
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression delete 未读完");
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
if (DeletePossibleShape.Kind(units) !== DeletePossibleShape.KindDelete) {
  return false;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "." || text === "?." || text === "!";
}
if (unit instanceof Bracket) {
  return (unit as Bracket).StartBracketChar === "[";
}
return false;
```
