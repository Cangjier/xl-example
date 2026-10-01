// xl:note 元组模式里的多个 infer 位置
// xl:expect ConditionalType,TypeAssign,Keyword
// xl:absent TernaryOperator
type X = T extends [infer A, infer B] ? [B, A] : never
