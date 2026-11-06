# dependencies
```xl
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../../names/identifier-shape.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { OperandUtil } from "../../expressions/operand-util.xl.md"
import { StringLiteralShape } from "../../literals/string-literal-shape.xl.md"
import { LiteralTypeShape } from "../type-node-shapes.xl.md"
import { TypeParameterShape } from "../type-node-shapes.xl.md"
import { TypeReferenceShape } from "../type-node-shapes.xl.md"
import { TypeShape } from "../type-shape.xl.md"
import { TypeBodyUtil } from "../type-body-util.xl.md"
import { TypeConditionalScan } from "../type-conditional-scan-util.xl.md"
import { TypeKeywordUtil } from "../type-keyword-util.xl.md"
```


# namespace cangjie

# class FunctionBuild

## static method BodyStart:(units:Array<Token>)=>int

```ts
const equals = TypeConditionalScan.TopLevelEquals(units, units.length);
if (equals < 0 || !TypeConditionalScan.Balanced(units, 0, equals)) {
  return -1;
}
const start = TypeConditionalScan.FirstCodeIndex(units, equals + 1, units.length);
return start >= 0 && start < units.length ? start : -1;
```

## static method NextCode:(units:Array<Token>, from:int, limit:int)=>int

```ts
let at = from;
while (at < limit && units[at].IsTriviaToken) {
  at++;
}
return at < limit ? at : -1;
```

## static method MatchClose:(units:Array<Token>, openIndex:int, open:string, close:string)=>int

```ts
let depth = 0;
for (let at = openIndex; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = unit.TempToString();
  if (text === open) {
    depth++;
  } else if (text === close) {
    depth--;
    if (depth === 0) {
      return unit.Closed ? at : -1;
    }
  }
}
return -1;
```

## static method AngleClose:(units:Array<Token>, openIndex:int)=>int

```ts
return FunctionBuild.MatchClose(units, openIndex, "<", ">");
```

## static method TypeParameterNames:(units:Array<Token>, openIndex:int, closeIndex:int)=>Array<int> | null

```ts
const names:Array<number> = [];
let expectName = true;
for (let at = openIndex + 1; at < closeIndex; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (expectName) {
    if (!(unit instanceof Common) || !unit.Closed) {
      return null;
    }
    const text = unit.TempToString();
    if (!OperandUtil.IsIdentifier(text) || OperandUtil.IsKeyword(text)) {
      return null;
    }
    names.push(at);
    expectName = false;
    continue;
  }
  if (!(unit instanceof Symbol) || !unit.Is(",")) {
    return null;
  }
  expectName = true;
}
if (expectName || names.length === 0) {
  return null;
}
return names;
```

## static method BuildTypeParameters:(units:Array<Token>, names:Array<int>, template:Template)=>Array<Token>

```ts
const parameters:Array<Token> = [];
for (const nameIndex of names) {
  const unit = units[nameIndex] as Common;
  const pos = ItemUtil.PositionOf(units, nameIndex);
  const parameter = new TypeParameterShape(template);
  parameter.Pos = pos;
  parameter.SignIn(unit.SourceRange.Start);
  parameter.Add(IdentifierShape.FromCommon(unit, pos));
  parameter.SignOut(unit.SourceRange.End);
  parameter.Closed = true;
  parameters.push(parameter);
}
return parameters;
```

## static method SignatureArrow:(units:Array<Token>, openIndex:int)=>int

```ts
if (openIndex < 0 || openIndex >= units.length) {
  return -1;
}
const open = units[openIndex];
if (!(open instanceof Symbol) || !open.Closed || !open.Is("(")) {
  return -1;
}
const closeIndex = FunctionBuild.MatchClose(units, openIndex, "(", ")");
if (closeIndex < 0) {
  return -1;
}
const next = FunctionBuild.NextCode(units, closeIndex + 1, units.length);
if (next < 0) {
  return -1;
}
const arrow = units[next];
return arrow instanceof Symbol && arrow.Closed && arrow.Is("=>") ? next : -1;
```

## static method OpenParenAfter:(units:Array<Token>, newIndex:int)=>int

```ts
const first = FunctionBuild.NextCode(units, newIndex + 1, units.length);
if (first < 0) {
  return -1;
}
const unit = units[first];
if (unit instanceof Symbol && unit.Is("<")) {
  return FunctionBuild.GenericOpen(units, first);
}
return unit instanceof Symbol && unit.Closed && unit.Is("(") ? first : -1;
```

## static method ConstructorArrow:(units:Array<Token>, bodyIndex:int, abstractIndex:int)=>int

```ts
const newIndex = abstractIndex < 0 ? bodyIndex : FunctionBuild.NextCode(units, abstractIndex + 1, units.length);
if (newIndex < 0) {
  return -1;
}
const openParen = FunctionBuild.OpenParenAfter(units, newIndex);
if (openParen < 0) {
  return -1;
}
return FunctionBuild.SignatureArrow(units, openParen);
```

## static method GenericArrow:(units:Array<Token>, openAngle:int)=>int

```ts
const openParen = FunctionBuild.GenericOpen(units, openAngle);
if (openParen < 0) {
  return -1;
}
return FunctionBuild.SignatureArrow(units, openParen);
```

## static method GenericOpen:(units:Array<Token>, openAngle:int)=>int

```ts
const closeAngle = FunctionBuild.AngleClose(units, openAngle);
if (closeAngle < 0) {
  return -1;
}
const openParen = FunctionBuild.NextCode(units, closeAngle + 1, units.length);
if (openParen < 0) {
  return -1;
}
const open = units[openParen];
return open instanceof Symbol && open.Closed && open.Is("(") ? openParen : -1;
```

## static method IsReturnAtom:(unit:Token)=>bool

```ts
if (unit instanceof TypeShape) {
  return false;
}
if (!unit.Closed) {
  return false;
}
if (unit instanceof Common) {
  const text = unit.TempToString();
  if (TypeBodyUtil.IsKeywordTypeText(text)) {
    return true;
  }
  return OperandUtil.IsIdentifier(text) && !OperandUtil.IsKeyword(text);
}
return unit instanceof String;
```

## static method BuildReturnAtom:(units:Array<Token>, index:int, template:Template)=>Token | null

```ts
if (index < 0 || index >= units.length) {
  return null;
}
const unit = units[index];
if (!FunctionBuild.IsReturnAtom(unit)) {
  return null;
}
const pos = ItemUtil.PositionOf(units, index);
if (unit instanceof String) {
  const literal = StringLiteralShape.FromString(unit, pos);
  const literalType = new LiteralTypeShape(template);
  literalType.Pos = pos;
  literalType.SignIn(unit.SourceRange.Start);
  literalType.Add(literal);
  literalType.SignOut(unit.SourceRange.End);
  literalType.Closed = true;
  return literalType;
}
const common = unit as Common;
const keyword = TypeKeywordUtil.KeywordTypeOf(common, pos);
if (keyword !== null) {
  return keyword;
}
const identifier = IdentifierShape.FromCommon(common, pos);
const reference = new TypeReferenceShape(template);
reference.Pos = pos;
reference.SignIn(common.SourceRange.Start);
reference.Add(identifier);
reference.SignOut(common.SourceRange.End);
reference.Closed = true;
return reference;
```

## static method SingleCode:(units:Array<Token>)=>int

```ts
let code = -1;
let count = 0;
for (let at = 0; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  code = at;
  count++;
}
if (count !== 1) {
  return -1;
}
return code >= 0 ? code : -1;
```

## static method FinishReturn:(host:Token)=>Token | null

```ts
const units = host.Data;
const codeIndex = FunctionBuild.SingleCode(units);
if (codeIndex < 0) {
  return null;
}
const unit = units[codeIndex];
if (unit instanceof TypeShape) {
  return unit.Closed ? unit : null;
}
return FunctionBuild.BuildReturnAtom(units, codeIndex, host.Template);
```
