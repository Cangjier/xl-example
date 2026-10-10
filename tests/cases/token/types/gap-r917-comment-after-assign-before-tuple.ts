// xl:note 注释夹在 `=` 与类型位的 `[` 之间时，同一格也落成值位的下标访问
// xl:round 917
// 第 921 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是链规则
// （`PropertyAccessCloseRule`）在内层那个空方括号上先动手——它的父亲那一刻还是裸 `Bracket`，
// `IsTypeContainerUnit` 判不过，于是 `C[]` 被折成下标访问，外层升格成 `TupleType` 时里面
// 装的已经是 `PropertyAccess`。现在链规则在「空括号的容器是一对类型位的方括号」处让路
// （`IsTypePositionEmptyBracket` 多了 `IsTypePositionBracket(unit.Parent)` 那一支），
// 升格之后 `TypeBracketCloseRule` 拿到的是裸括号 ⇒ `ArrayType`。
// xl:expect TupleType:1,RestType:1,ArrayType:1
// xl:end
type Z = /*c*/[A, B?, ...C[]];
