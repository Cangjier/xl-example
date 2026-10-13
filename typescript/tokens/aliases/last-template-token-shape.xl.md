# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class LastTemplateTokenShape extends UnitToken

对应 `SyntaxKind.LastTemplateToken`（`TemplateTail` 的别名，同一个值）：

```txt
≡ TemplateTail
`a${b}`
```

## constructor:(template:Template)=>void

```ts
super(template);
```
