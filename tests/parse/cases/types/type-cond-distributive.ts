// xl:note 条件类型对被检查的联合类型做分发
// xl:expect TypeAssign,Keyword
// xl:absent TernaryOperator
type X = (A | B) extends U ? 1 : 2
