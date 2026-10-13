# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class TemplateLiteralTypeSpanShape extends UnitToken

对应 `SyntaxKind.TemplateLiteralTypeSpan` 的写法：

```txt
type T = `a${B}c`;
```

## constructor:(template:Template)=>void

```ts
super(template);
```
