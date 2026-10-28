# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class AsteriskTokenShape extends ShapeToken

```txt
*
```

## field Op:string = ""

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromSymbol:(token:Symbol, context:SyntaxContext)=>AsteriskTokenShape

```ts
if (!token.Is("*")) {
  throw new Error("增量变量形状未支持：expression 星号运算符 " + token.TempToString());
}
const shape = new AsteriskTokenShape(token.Template);
if (token.SourceRange.Start >= 0) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End >= 0) {
  shape.SignOut(token.SourceRange.End);
}
shape.Op = "*";
shape.TryToClose(context);
return shape;
```
