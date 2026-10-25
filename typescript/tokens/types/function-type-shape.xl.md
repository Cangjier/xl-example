# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class FunctionTypeShape extends ShapeToken

```txt
type T = () => B;
type T = (a: A) => B;
type T = (a: A, b: B) => C;
```

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
