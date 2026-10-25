# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypeReferenceShape extends ShapeToken

```txt
type T = A;
type T = A.B;
type T = A<B, C>;
```

## field TypeName:Token | null = null

## field TypeArguments:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
