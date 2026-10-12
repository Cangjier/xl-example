# dependencies
```xl
import { BlockToken } from "./block-token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状块：形状建成之后仍然把字符攒进自己的 `Temp`。

# class ShapeCommonToken extends BlockToken

形状块。

## constructor:(template:Template)=>void

以模板创建，转调基类构造器。

```ts
super(template);
```
