# dependencies
```xl
import { Template } from "./templates/template.xl.md"
import { UnitToken } from "./unit-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状单元：形状建出来的单元的公共基类——建成之后仍然吃字符，跳转队列就是 basic token 那一条。

# class ShapeToken extends UnitToken

## constructor:(template:Template)=>void

以模板创建，并接上 basic token 的跳转队列。

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
```
