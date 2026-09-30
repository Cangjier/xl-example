// xl:note infer 声明带约束：infer U extends string
// xl:expect TypeAssign,Keyword
// xl:absent TernaryOperator
type X = T extends infer U extends string ? U : never
