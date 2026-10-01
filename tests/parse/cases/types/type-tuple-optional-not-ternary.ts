// xl:note 元组里的 `?` 是可选标记、`name:` 是具名元素，都不许被配成三元运算符（第 66 轮第三批的回归钉子）
// xl:expect TupleType,OptionalType,NamedTupleMember,TypeDefine
// xl:absent TernaryOperator
type T = [A?, name: B];
