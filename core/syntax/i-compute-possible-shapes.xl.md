# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { ComputePossibleShapesStates } from "./compute-possible-shapes-states.xl.md"
import { Token } from "./token.xl.md"
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

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

括号创建事件：`Bracket.Transit` 建出一个新括号、把它挂到宿主名下并签入之后，回调宿主一次。

宿主借此在括号刚有身份的时候配置它——`InterfaceDeclarationShape` 就靠这个事件判断新建的括号是不是自己的接口体，是的话给这个 `Bracket` 挂上接口体目录向导（`Bracket` 经 `UnitToken` 已经是 `IComputePossibleShapes` 的宿主）。

形参写成 `Token` 而不是 `Bracket`：basic token 不能反过来 import 括号，否则 `Bracket` ↔ `IComputePossibleShapes` 成 require 环。实参一定是 `Bracket`，需要括号细节的实现自己转换。

默认实现什么都不做（普通单元不关心括号创建）。
