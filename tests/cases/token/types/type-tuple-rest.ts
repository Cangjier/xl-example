// xl:note 带剩余元素的元组。**元组里的 `...` 不是展开运算**：TypeScript 的 AST 把它记成
// `RestType`（类型层的东西），一个 `SpreadElement` 都不产生，所以这里不该出现 `Spread`
// （差分账上 `Spread` 多出 4 个就是这个形状）
// xl:expect TypeAssign
// xl:absent Spread
type X = [string, ...number[]]
