# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class TemplateLiteralTypeShape extends UnitToken

对应 `SyntaxKind.TemplateLiteralType` 的写法：

```txt
type T = `a${B}`;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
