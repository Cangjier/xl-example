# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TemplateMiddleShape extends ShapeToken

```txt
`a${b}c${d}`
```

模板中段：从 `}` 到下一个 `${` 的 `{`（含）。`Text` 是 `}` 与 `${` 之间的 cooked 文本。

## field Text:string = ""

cooked 文本（不含 `}` 与 `${`）。

## constructor:(template:Template)=>void

```ts
super(template);
```
