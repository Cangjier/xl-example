# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ConditionalTypeShape extends UnitToken

对应 `SyntaxKind.ConditionalType` 的写法：

```txt
type T<U> = U extends A ? B : C;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
