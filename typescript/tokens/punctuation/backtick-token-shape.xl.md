# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class BacktickTokenShape extends ShapeToken

```txt
TS 6 的扫描器不产出：`` ` `` 一律按模板字面量扫（NoSubstitutionTemplateLiteral / TemplateHead）。
```

## constructor:(template:Template)=>void

```ts
super(template);
```
