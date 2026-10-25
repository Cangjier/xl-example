# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ArrayTypeShape extends ShapeToken

```txt
type T = A[];
type T = A[][];
type T = (A | B)[];
```

## field ElementType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
