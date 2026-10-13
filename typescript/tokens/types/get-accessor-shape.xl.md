# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class GetAccessorShape extends UnitToken

对应 `SyntaxKind.GetAccessor` 的写法：

```txt
class C { get a() { return 1; } }
```

## constructor:(template:Template)=>void

```ts
super(template);
```
