# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class InferTypeShape extends ShapeToken

```txt
type T = A extends (infer U)[] ? U : never;
```

## field TypeParameter:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
