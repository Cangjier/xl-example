// xl:note 条件类型里的 infer 声明与泛型实参
// xl:expect ConditionalType,TypeAssign,GenericType,Keyword
// xl:absent TernaryOperator
type X = T extends Array<infer U> ? U : never
