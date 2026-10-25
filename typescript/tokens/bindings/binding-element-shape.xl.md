# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DotDotDotTokenShape } from "../punctuation/dot-dot-dot-token-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ArrayBindingPatternShape } from "./array-binding-pattern-shape.xl.md"
import { ObjectBindingPatternShape } from "./object-binding-pattern-shape.xl.md"
import { ComputedPropertyNameShape } from "../types/computed-property-name-shape.xl.md"
```

# namespace cangjie

# class BindingElementShape extends ShapeToken

```txt
const { a: b = 1, ...rest } = o;
const [c, , ...rest] = xs;
```

## field DotDotDot:Token | null = null

## field PropertyName:Token | null = null

## field BindingName:Token | null = null

## field Initializer:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method MakeRest:(first:Token, last:Token, context:SyntaxContext, pos:int)=>DotDotDotTokenShape

```ts
const shape = new DotDotDotTokenShape(first.Template);
shape.SignInToken(first);
shape.SignOutToken(last);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method ParseName:(token:Token, context:SyntaxContext, pos:int)=>Token

```ts
if (token instanceof Bracket) {
  const bracket = token as Bracket;
  let pattern:ShapeToken;
  if (bracket.StartBracketChar === "[") {
    pattern = ArrayBindingPatternShape.FromBracket(bracket, context);
  } else if (bracket.StartBracketChar === "{") {
    pattern = ObjectBindingPatternShape.FromBracket(bracket, context);
  } else {
    throw new Error("绑定元素里出现不支持的括号");
  }
  pattern.Pos = pos;
  return pattern;
}
if (token instanceof Common) {
  const identifier = IdentifierShape.FromBasicToken(token as Common, context);
  identifier.Pos = pos;
  return identifier;
}
throw new Error("绑定元素缺少名字");
```

## static method FromTokens:(tokens:Array<Token>, context:SyntaxContext, pos:int)=>BindingElementShape | null

```ts
if (tokens.length === 0) {
  return null;
}
const first = tokens[0];
let index = 0;
let dotDotDot:Token | null = null;
let namePos = pos;
if (first instanceof Symbol && (first as Symbol).Is("...")) {
  dotDotDot = BindingElementShape.MakeRest(first, first, context, pos);
  index = 1;
  if (first.SourceRange.EndIndex >= 0) {
    namePos = first.SourceRange.EndIndex;
  }
} else if (first instanceof Symbol && (first as Symbol).Is(".")) {
  let lastDot:Token = first;
  let count = 0;
  while (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is(".")) {
    lastDot = tokens[index];
    count++;
    index++;
  }
  if (count !== 3) {
    return null;
  }
  dotDotDot = BindingElementShape.MakeRest(first, lastDot, context, pos);
  if (lastDot.SourceRange.EndIndex >= 0) {
    namePos = lastDot.SourceRange.EndIndex;
  }
}
if (index >= tokens.length) {
  return null;
}
let bindingName:Token;
let propertyName:Token | null = null;
if (tokens[index] instanceof Bracket && (tokens[index] as Bracket).StartBracketChar === "["
  && index + 1 < tokens.length && tokens[index + 1] instanceof Symbol
  && (tokens[index + 1] as Symbol).Is(":")) {
  // 解构里的计算属性名 `{ [k]: v }`：`[k]` 是 propertyName（ComputedPropertyName），
  // 里面的 k 是表达式而不是 binding element；与类成员的计算名同一口径。
  const computedBracket = tokens[index] as Bracket;
  const inner = new ExpressionBuilder(first.Template, context);
  let innerBase = namePos;
  if (computedBracket.SourceRange.StartIndex >= 0) {
    innerBase = computedBracket.SourceRange.StartIndex + 1;
  }
  inner.Load(computedBracket.Data, innerBase);
  if (inner.Units.length === 0) {
    return null;
  }
  const expression = inner.ParseExpression();
  if (inner.At !== inner.Units.length) {
    return null;
  }
  const computed = new ComputedPropertyNameShape(first.Template);
  computed.Add(expression);
  computed.SignInToken(computedBracket);
  computed.SignOutToken(computedBracket);
  computed.Pos = namePos;
  computed.TryToClose(context);
  propertyName = computed;
  const colon = tokens[index + 1];
  index += 2;
  if (index >= tokens.length) {
    return null;
  }
  let bindingPos = namePos;
  if (colon.SourceRange.EndIndex >= 0) {
    bindingPos = colon.SourceRange.EndIndex;
  }
  bindingName = BindingElementShape.ParseName(tokens[index], context, bindingPos);
  index++;
} else {
  bindingName = BindingElementShape.ParseName(tokens[index], context, namePos);
  index++;
  if (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is(":")) {
    const colon = tokens[index];
    index++;
    if (index >= tokens.length) {
      return null;
    }
    propertyName = bindingName;
    let bindingPos = namePos;
    if (colon.SourceRange.EndIndex >= 0) {
      bindingPos = colon.SourceRange.EndIndex;
    }
    bindingName = BindingElementShape.ParseName(tokens[index], context, bindingPos);
    index++;
  }
}
let initializer:Token | null = null;
if (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is("=")) {
  const equals = tokens[index];
  index++;
  if (index >= tokens.length) {
    return null;
  }
  let initializerPos = pos;
  if (equals.SourceRange.EndIndex >= 0) {
    initializerPos = equals.SourceRange.EndIndex;
  }
  const builder = new ExpressionBuilder(first.Template, context);
  builder.Load(tokens.slice(index), initializerPos);
  initializer = builder.ParseAssign();
  if (builder.At !== builder.Units.length) {
    return null;
  }
  index = tokens.length;
}
if (index !== tokens.length) {
  return null;
}
const shape = new BindingElementShape(first.Template);
shape.DotDotDot = dotDotDot;
shape.PropertyName = propertyName;
shape.BindingName = bindingName;
shape.Initializer = initializer;
if (dotDotDot !== null) {
  shape.Add(dotDotDot);
}
if (propertyName !== null) {
  shape.Add(propertyName);
}
shape.Add(bindingName);
if (initializer !== null) {
  shape.Add(initializer);
}
shape.SignInToken(first);
shape.SignOutToken(tokens[tokens.length - 1]);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
