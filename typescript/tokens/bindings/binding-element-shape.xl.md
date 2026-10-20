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
```

# namespace cangjie

# class BindingElementShape extends ShapeToken

```txt
const { a: b = 1, ...rest } = o;
const [c, , ...rest] = xs;
```

一个 binding element 的**形状**（不是 raw token 容器）：children 直接是 AST 子节点，顺序与 TS 一致 ——
`DotDotDotToken`、`PropertyName`、`BindingName`、`Initializer`。
名字一律是 `IdentifierShape`；嵌套 pattern 是 `ArrayBindingPatternShape` / `ObjectBindingPatternShape`；
默认值走 `ExpressionBuilder.ParseAssign`（TS 的 `BindingElement` **不含** `=` 这个 EqualsToken，只含 initializer）。

## field DotDotDot:Token | null = null

## field PropertyName:Token | null = null

## field BindingName:Token | null = null

## field Initializer:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method MakeRest:(first:Token, last:Token, context:SyntaxContext, pos:int)=>DotDotDotTokenShape

把一颗 `...` 单元（旧形态是三颗 `.`）折成一个 `DotDotDotTokenShape`：区间从第一颗点到最后一颗点，`Pos` 含前导 trivia。

```ts
const shape = new DotDotDotTokenShape(first.Template);
shape.SignInToken(first);
shape.SignOutToken(last);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method ParseName:(token:Token, context:SyntaxContext, pos:int)=>Token

名字位置允许：`Identifier`（Common，含关键字名）或嵌套 binding pattern（`[...]` / `{...}`）。
嵌套 pattern 的 `Pos` 由调用方给（含前导 trivia），内部元素的位置由 pattern 自己按括号算。

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

一个 binding element 的单元序列（trivia 已被调用方滤掉；`{` `}` `[` `]` 不在里面）：
`a` / `a = 1` 是 shorthand（object pattern）/ 纯名字 + 默认值（array pattern）；
`a : b` / `a : b = 1` 是 PropertyName + BindingName（object pattern 改名）；
`... a` / `... [a]` 是 rest element。
`Pos` 是这一组的起点（`[` / `,` 之后，含前导 trivia）；每个子节点按「前一个非 trivia 单元 End+1」逐段推进。
返回 `null` 表示「这组单元不是一个完整的 binding element」（调用方决定降级）。

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
  if (first.SourceRange.End !== null) {
    namePos = first.SourceRange.End.Index + 1;
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
  if (lastDot.SourceRange.End !== null) {
    namePos = lastDot.SourceRange.End.Index + 1;
  }
}
if (index >= tokens.length) {
  return null;
}
let bindingName:Token = BindingElementShape.ParseName(tokens[index], context, namePos);
index++;
let propertyName:Token | null = null;
if (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is(":")) {
  const colon = tokens[index];
  index++;
  if (index >= tokens.length) {
    return null;
  }
  propertyName = bindingName;
  let bindingPos = namePos;
  if (colon.SourceRange.End !== null) {
    bindingPos = colon.SourceRange.End.Index + 1;
  }
  bindingName = BindingElementShape.ParseName(tokens[index], context, bindingPos);
  index++;
}
let initializer:Token | null = null;
if (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is("=")) {
  const equals = tokens[index];
  index++;
  if (index >= tokens.length) {
    return null;
  }
  let initializerPos = pos;
  if (equals.SourceRange.End !== null) {
    initializerPos = equals.SourceRange.End.Index + 1;
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
