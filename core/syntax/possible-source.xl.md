# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

候选判定的**触发来源**：同一条候选判定可能被两个时机问到，候选按来源决定怎么判。

来源**只走形参**：`IComputePossibleShapes` / `CatalogGuide` / `PossibleShape` 的计算方法都要求显式传入，
没有默认值、不从字段或静态量读取。这样漏传会在编译期暴露，而不是悄悄退化成某一个来源。

# enum PossibleSource

候选计算方法的必填尾参（`PossibleShape.Compute` / `ComputeByIndex`、
`IComputePossibleShapes.ComputePossibleShapes` / `ComputePossibleShapesByIndex`、
`CatalogGuide` 的同名方法）。

- case Close
  basic token 关闭时问父单元。这是既有路径：所有既有调用点显式传 `PossibleSource.Close`，
  于是 legacy 路径逐字节不变。
- case BracketCreate
  括号刚建出来、挂到宿主名下之后问一次。由 `StatementRouteUtil.EnableBracketCreatePossible`
  打开的触发点（`Bracket.Transit` 在 `BracketRoleHook` 之后）传入；默认关闭。
