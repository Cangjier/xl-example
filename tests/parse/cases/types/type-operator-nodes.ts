// xl:note 类型运算符：keyof / typeof / readonly / unique（第 66 轮补的节点）
// xl:expect TypeAssign:5,TypeOperator:4,TypeQuery:2,ArrayType
// （`keyof typeof h` 两层都成立：内层 TypeQuery、外层 TypeOperator）
type A = keyof B
type C = typeof d
type E = readonly F[]
type G = keyof typeof h
type I = unique symbol
