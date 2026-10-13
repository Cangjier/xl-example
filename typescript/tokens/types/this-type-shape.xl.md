# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class ThisTypeShape extends UnitToken

对应 `SyntaxKind.ThisType` 的写法：

```txt
class C { m(): this { return this; } }
```

## constructor:(template:Template)=>void

```ts
super(template);
```
