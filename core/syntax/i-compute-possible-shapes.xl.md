# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { ComputePossibleShapesStates } from "./compute-possible-shapes-states.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

候选形状计算接口：把「谁能被 basic token 命中」变成一条**成员契约**——basic token 关闭时只认这个接口，不认具体类型。

这样 basic token 不需要 import 目录向导，也不会形成 require 环。

# interface IComputePossibleShapes

候选形状计算的接口。

`CatalogGuide` 是宿主指向目录向导的引用：`null` 表示本单元没挂向导，被问到也不做任何事。

返回值统一是 `ComputePossibleShapesStates`：调用方要判断的是「这次有没有建出形状」，而不是「建了什么」——形状是谁由目录自己知道。

## property CatalogGuide:CatalogGuide | null

本单元挂着的目录向导；`null` 表示没挂。

## method ComputePossibleShapes:(context:SyntaxContext)=>ComputePossibleShapesStates

重算本单元目录里的候选。

无参：触发者是谁由实现自己决定（`UnitToken` 的实现把自己转交给向导）。

## method ComputePossibleShapesByIndex:(tokenIndex:int, context:SyntaxContext)=>ComputePossibleShapesStates

按子单元下标重算本单元目录里的候选。

无参版看全部子单元，本版只看 `tokenIndex` 那一个，留给「逐个喂子单元」的调用方。
