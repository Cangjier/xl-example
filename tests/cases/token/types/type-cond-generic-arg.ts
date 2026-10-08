// xl:note 条件类型作为泛型实参
// xl:expect ConditionalType,TypeAssign,GenericType,Keyword
// xl:absent TernaryOperator
type X = Wrap<T extends U ? A : B>
