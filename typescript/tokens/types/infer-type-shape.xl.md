# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class InferTypeShape extends ShapeToken

```txt
type T<U> = U extends Array<infer V> ? V : never;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
