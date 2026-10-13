# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class InferTypeShape extends UnitToken

```txt
type T<U> = U extends Array<infer V> ? V : never;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
