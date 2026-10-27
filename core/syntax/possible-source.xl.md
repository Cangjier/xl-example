# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

候选判定的**触发来源**：同一条候选判定可能被两个时机问到，候选（经 `PossibleShapeCache.Source`）按来源决定怎么判。

# enum PossibleSource

`IComputePossibleShapes` 与 `CatalogGuide` 上那两个计算方法的可选尾参；**不传即 `Close`**。

默认值必须取 `Close`：既有调用点一律不传参，于是 legacy 路径逐字节不变。

- case Close
  basic token 关闭时问父单元。这是既有路径，也是缺省值。
- case BracketCreate
  括号刚建出来、挂到宿主名下之后问一次。目前只有 `Bracket.OnBracketCreatedEvent` 里那条窄触发会走到。
