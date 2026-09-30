// xl:note 嵌套条件类型（括号内再一个条件类型）
// xl:expect TypeAssign,Keyword
// xl:absent TernaryOperator
type X = T extends U ? (A extends B ? C : D) : E
