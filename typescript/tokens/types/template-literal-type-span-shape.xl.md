# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TemplateLiteralTypeSpanShape extends ShapeToken

```txt
type T = `a${B}c`;
```

模板字面量类型的插值段：children = 插值类型 + 尾段（`TemplateMiddle` 或 `TemplateTail`）。
实测 `` `a${B}c` `` 的 span 是 `[13,17)`：插值 `TypeReference[13,14)`、`TemplateTail[14,17) text="c"`；
span 的起点是 `${` 之后、终点是尾段终点。

## field Type:Token | null = null

## field Tail:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
