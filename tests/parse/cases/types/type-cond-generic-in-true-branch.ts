// xl:note 条件类型真分支里的类型实参：`? F<A, B> : C` 的泛型段必须成形（第 66 轮）
// xl:expect ConditionalType,GenericType
// xl:absent TernaryOperator
type X = T extends U ? F<A, B> : C
