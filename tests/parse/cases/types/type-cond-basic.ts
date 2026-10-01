// xl:note 基本条件类型 T extends U ? A : B；类型位置不应落成三元表达式节点
// xl:expect ConditionalType,TypeAssign,Keyword
// xl:absent TernaryOperator
type X = T extends U ? A : B
