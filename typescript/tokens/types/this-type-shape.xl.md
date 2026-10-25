# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ThisTypeShape extends ShapeToken

```txt
type T = this;
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>ThisTypeShape

```ts
const shape = new ThisTypeShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
