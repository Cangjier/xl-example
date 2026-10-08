// xl:note 条件类型约束里的构造类型 `abstract new(...) => any`：不许被当成方法声明（第 66 轮）
// xl:expect ConditionalType,FunctionType
// xl:absent TernaryOperator
type F = T extends abstract new(...args: any) => any ? T : undefined
