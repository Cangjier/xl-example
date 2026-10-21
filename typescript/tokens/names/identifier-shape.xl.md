# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class IdentifierShape extends ShapeToken

```txt
name
```

## field EscapedText:string = ""

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>IdentifierShape

```ts
const shape = new IdentifierShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
shape.EscapedText = IdentifierShape.DecodeIdentifierEscapes(token.TempToString());
shape.TryToClose(context);
return shape;
```

## static method DecodeIdentifierEscapes:(text:string)=>string

把标识符原文里的 `\uXXXX` 解成对应字符；其余字符原样保留。

**位置不在这里算**：token 的 `SourceRange` 仍是原文（一个 `\uXXXX` 占 6 个字符），本方法只产生 `EscapedText`（AST `text`），
与 TS 的 `Identifier.text` 一致（解码值）。非法转义不会走到这里（`Common.IsUnicodeEscapeStart` 已经挡掉），这里再校验一次，非法就保留原文。

```ts
let result = "";
let at = 0;
while (at < text.length) {
  if (text[at] === "\\" && at + 5 < text.length && text[at + 1] === "u") {
    const hex = text.substring(at + 2, at + 6);
    if (/^[0-9a-fA-F]{4}$/.test(hex)) {
      result += String.fromCharCode(parseInt(hex, 16));
      at += 6;
      continue;
    }
  }
  result += text[at];
  at++;
}
return result;
```
