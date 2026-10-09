// xl:note 元组元素里的数组类型、而且元组写在 `=` 的下一行：`type X =` 换行 `[C[]];`——TS 那边仍是 `TupleType > ArrayType`，产物把 `C[]` 收成值位的 `ElementAccessExpression`
// xl:round 916
// xl:known-gap `=` 之后那个换行让外层 `[` 晚一步才被认成类型位（那一刻它还是裸括号），内层 `[]` 先被 `PropertyAccessCloseRule` 当成下标吃掉；外层后来收成 `TupleType` 时，内层的父亲已经是 `PropertyAccess`，`IsTypeContainerUnit` 再也放不过它（同一行写就没有这个时间差，见 `ty-tuple-element-array`）
// xl:end
type X =
[C[]];
