// xl:note 方括号的三种类型构造：数组 / 元组 / 下标访问（第 66 轮补的节点）
// xl:expect TypeAssign:4,ArrayType:2,TupleType:3,IndexedAccessType,TypeOperator
type A = string[]
type B = readonly [A, B]
type C = [A, B][0]
type D = Map<string, [A, B]>[]
