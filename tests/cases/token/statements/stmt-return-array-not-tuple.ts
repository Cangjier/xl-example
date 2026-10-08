// xl:note 函数体里 `return [ … ]` 是值位数组字面量，不是元组类型（第 66 轮）
// xl:expect ArrayLiteral,String
// xl:absent LiteralType,TupleType
function f(): string { return ["a"]; }
