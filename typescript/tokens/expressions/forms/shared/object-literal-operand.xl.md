# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { ExpressionAtomRegistry } from "./expression-atom-registry.xl.md"
```

# namespace cangjie

```text
const v = a in { b: 1 };        // `}` 处 CatalogGuide: 没有候选形状可以构成（宿主 BinaryExpressionShape）
const v = a instanceof { b: 1 };
const v = typeof { b: 1 };      // 前缀一元：expression 前缀一元操作数
const v = a + { b: 1 };         // 与 `in` 同一条：右操作数目录不认 `{`
const v = a && { b: 1 };
const v = a ? { b: 1 } : c;     // 三目中段：ConditionalMemberPossibleShape 只认 Common
```

# class ObjectLiteralOperandPossibleShape extends PossibleShape

## static method Claims:(unit:Token)=>bool

```ts
if (unit === null) {
  return false;
}
if (!(unit instanceof Bracket)) {
  return false;
}
if (!(unit as Bracket).Closed) {
  return false;
}
return (unit as Bracket).StartBracketChar === "{";
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
if (!ObjectLiteralOperandPossibleShape.Claims(unit)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
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
return ObjectLiteralOperandPossibleShape.Claims(unit);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const codeIndex = ItemUtil.NextCode(host.Data, tokenIndex);
if (codeIndex < 0 || codeIndex >= host.Data.length) {
  throw new Error("增量变量形状未支持：值位对象字面量");
}
return ObjectLiteralOperandPossibleShape.BuildInto(host, codeIndex, context);
```

## static method BasePos:(units:Array<Token>, bracket:Bracket, at:int)=>int

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit.SourceRange.EndIndex >= 0) {
    return unit.SourceRange.EndIndex;
  }
  if (unit.SourceRange.StartIndex >= 0) {
    return unit.SourceRange.StartIndex;
  }
  break;
}
if (bracket.SourceRange.StartIndex >= 0) {
  return bracket.SourceRange.StartIndex;
}
return 0;
```

## static method BuildInto:(host:Token, codeIndex:int, context:SyntaxContext)=>Token

```ts
const units = host.Data;
if (codeIndex < 0 || codeIndex >= units.length) {
  throw new Error("增量变量形状未支持：值位对象字面量");
}
const unit = units[codeIndex];
if (!(unit instanceof Bracket)) {
  throw new Error("增量变量形状未支持：值位对象字面量不是括号");
}
const bracket = unit as Bracket;
if (!bracket.Closed) {
  throw new Error("增量变量形状未支持：值位对象字面量括号未闭合");
}
if (bracket.StartBracketChar !== "{") {
  throw new Error("增量变量形状未支持：值位对象字面量括号字符 " + bracket.StartBracketChar);
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(units, ObjectLiteralOperandPossibleShape.BasePos(units, bracket, codeIndex));
const index = builder.Units.indexOf(bracket);
if (index < 0) {
  throw new Error("增量变量形状未支持：值位对象字面量不在宿主里");
}
builder.At = index;
const built = builder.ParsePrimary();
if (built === null || built === bracket || built.IsBasicToken) {
  throw new Error("增量变量形状未支持：值位对象字面量未建出形状");
}
if (builder.At !== index + 1) {
  throw new Error("增量变量形状未支持：值位对象字面量未读全");
}
built.Parent = host;
if (host.MountedUnit === bracket) {
  host.MountedUnit = built;
}
units.splice(codeIndex, 1, built);
ExpressionAtomRegistry.RegisterContainer(built);
return built;
```
