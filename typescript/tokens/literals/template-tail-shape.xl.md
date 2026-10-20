# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TemplateTailShape extends ShapeToken

```txt
`a${b}`
```

模板尾：从 `}` 到闭引号 `` ` ``（含）。TS 的 kind 名是 `LastTemplateToken`（`TemplateTail`）。
`Text` 是 `}` 与 `` ` `` 之间的 cooked 文本。

## field Text:string = ""

cooked 文本（不含 `}` 与 `` ` ``）。

## constructor:(template:Template)=>void

```ts
super(template);
```
