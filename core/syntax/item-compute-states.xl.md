# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状目录重算的结果。

# enum ItemComputeStates

`CatalogGuide.ComputeItems` 与 `UnitToken.ComputeItems` 的返回值。

- case Nothing
这次什么都没做：宿主没有目录向导，或者下标越界。
- case Waiting
问了候选，但还有多个活着，继续等后面的单元。
- case Built
只剩一个候选，并且已经把它建出来了。
