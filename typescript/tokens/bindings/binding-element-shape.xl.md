# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
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

## static method FromTokens:(tokens:Array<Token>, context:SyntaxContext, pos:int)=>BindingElementShape | null

```ts
// 一个 binding element 的单元序列（trivia 已被调用方滤掉；`{` `}` `[` `]` 不在里面）：
//   `a` / `a = 1`              shorthand（object pattern 里）/ 纯名字（array pattern 里）
//   `a : b` / `a : b = 1`      PropertyName + BindingName（object pattern 的改名写法）
//   `... a` / `... [a]`        rest element
// TS 的 BindingElement 子节点顺序是 DotDotDotToken、PropertyName、Name、Initializer；
// 这里也按这个顺序 Add，区间从第一个单元起到最后一个单元止。
let dotDotDot:Token | null = null;
let propertyName:Token | null = null;
let bindingName:Token | null = null;
let initializer:Token | null = null;
let index = 0;
while (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is(".")) {
  // `...` 目前是三个 `Symbol` 点；punctuation 家族的 DotDotDotToken 就绪后可换成一颗单元，判断不变。
  dotDotDot = tokens[index];
  index++;
}
if (index >= tokens.length) {
  return null;
}
bindingName = tokens[index];
index++;
if (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is(":")) {
  propertyName = bindingName;
  index++;
  if (index >= tokens.length) {
    return null;
  }
  bindingName = tokens[index];
  index++;
}
if (index < tokens.length && tokens[index] instanceof Symbol && (tokens[index] as Symbol).Is("=")) {
  index++;
  if (index >= tokens.length) {
    return null;
  }
  initializer = tokens[index];
  index++;
}
if (index !== tokens.length || bindingName === null) {
  // 还有多余单元（或根本没名字）：这一组不是**单个** binding element，交给调用方决定怎么降级。
  return null;
}
const shape = new BindingElementShape(bindingName.Template);
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
shape.SignInToken(tokens[0]);
shape.SignOutToken(tokens[tokens.length - 1]);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
