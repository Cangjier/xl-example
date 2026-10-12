// xl:note 条件类型作为联合成员
// xl:expect ConditionalType,TypeAssign,Keyword
// xl:absent TernaryOperator
type X = (T extends U ? A : B) | C
