# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TemplateHeadShape extends ShapeToken

```txt
`a${b}`
```

模板头：从开引号 `` ` `` 到第一个 `${` 的 `{`（含）。没有子节点，`Text` 是两段定界符之间的 cooked 文本。

## field Text:string = ""

cooked 文本（不含 ` 与 `${`）。

## constructor:(template:Template)=>void

```ts
super(template);
```
