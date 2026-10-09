// xl:note 元组元素里的数组类型、而且元组写在 `=` 的下一行：`type X =` 换行 `[C[]];`——TS 那边是 `TupleType > ArrayType`，产物原来是值位的 `ElementAccessExpression`
// xl:round 916
// 第 917 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `=` 之后那个换行让外层 `[` 晚一步才被认成类型位（那一刻它还是裸括号），
// 内层 `[]` 先被 `PropertyAccessCloseRule` 当成下标吃掉；外层后来收成 `TupleType` 时，
// 内层的父亲已经是 `PropertyAccess`，`IsTypeContainerUnit` 再也放不过它。
// 现在链规则在「链尾是一个类型位的空方括号」时让路（`IsTypePositionEmptyBracket`，
// 判据是括号自己的 `Context`——开括号那一刻算好、与重组时序无关），
// `TypeBracketCloseRule` 下一趟拿到的就是裸括号，同一行写与换行写从此同形。
// xl:expect TupleType,ArrayType,Identifier,SymbolToken
// xl:end
type X =
[C[]];
