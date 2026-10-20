# dependencies
```xl
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

# class NoSubstitutionTemplateLiteralShape extends ShapeToken

```txt
`t`
```

无内插的模板串：TS 的 `NoSubstitutionTemplateLiteral`（`ts.SyntaxKind` 反查印 `FirstTemplateToken`）。
它只有一个叶子、没有子节点；`Text` 是**去掉定界符之后**的 cooked 文本（转义已在 token 层解码）。

## field Text:string = ""

cooked 文本（不含反引号）。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:String, context:SyntaxContext)=>NoSubstitutionTemplateLiteralShape

从模板 `String` token 建：区间取 token 的首尾，文本是所有常量块 `TempToString()` 的串接（无内插时 `Data` 里只有 `ConstString`）。

```ts
const shape = new NoSubstitutionTemplateLiteralShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
let text = "";
for (const part of token.Data) {
  if (part instanceof ConstString) {
    text += (part as ConstString).TempToString();
  }
}
shape.Text = text;
shape.TryToClose(context);
return shape;
```
