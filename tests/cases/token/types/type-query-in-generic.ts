// xl:note 类型实参段里的 `typeof X` 是类型查询，不是一元运算（与标注位同形）
// xl:expect GenericType,Keyword
// xl:absent UnaryOperator
let v: Wrap<typeof x>
