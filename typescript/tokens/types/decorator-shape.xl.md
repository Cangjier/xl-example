# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class DecoratorShape extends ShapeToken

```txt
@dec class C {}
@dec() class C {}
@a.b class C {}
class C { @dec m() {} }
```

## field Expression:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromParts:(atToken:Token, expression:Token, pos:int, context:SyntaxContext)=>DecoratorShape

```ts
const shape = new DecoratorShape(atToken.Template);
shape.Expression = expression;
shape.Add(expression);
shape.SignInToken(atToken);
shape.SignOutToken(expression);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
