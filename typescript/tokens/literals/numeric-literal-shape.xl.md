# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class NumericLiteralShape extends ShapeToken

```txt
1
1.5
0x1f
```

## field Text:string = ""

数字字面量的值文本，口径同 ts 的 `NumericLiteral.text`：先去掉语言配置的后缀与 `_` 分隔符，再按数值规范化（`0x1f` 记成 `31`、`.5` 记成 `0.5`、`1e3` 记成 `1000`），不保留源码写法。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>NumericLiteralShape

```ts
if (!token.IsNumber()) {
  throw new Error("不是数字字面量: " + token.TempToString());
}
const shape = new NumericLiteralShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
const body = token.NumberBody();
let raw = "";
for (const item of body) {
  if (item !== "_") {
    raw += item;
  }
}
shape.Text = String(Number(raw));
shape.TryToClose(context);
return shape;
```
