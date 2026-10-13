# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class BacktickTokenShape extends UnitToken

对应 `SyntaxKind.BacktickToken`（没有源码形态）：

```txt
TS 6 的扫描器不产出：`` ` `` 一律按模板字面量扫（NoSubstitutionTemplateLiteral / TemplateHead）。
```

## constructor:(template:Template)=>void

```ts
super(template);
```
