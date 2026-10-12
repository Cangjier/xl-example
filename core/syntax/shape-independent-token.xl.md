# dependencies
```xl
import { IndependentToken } from "./independent-token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状独立单元：形状建成之后不再接收字符。

# class ShapeIndependentToken extends IndependentToken

形状独立单元。

## constructor:(template:Template)=>void

以模板创建，转调基类构造器。

```ts
super(template);
```
