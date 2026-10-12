# dependencies
```xl
import { Template } from "./templates/template.xl.md"
import { UnitToken } from "./unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状单元：形状建成之后仍然把字符引给挂载的子单元。

# class ShapeUnitToken extends UnitToken

形状单元。

## constructor:(template:Template)=>void

以模板创建，转调基类构造器。

```ts
super(template);
```
