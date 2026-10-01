// xl:note satisfies 右边的类型文本也要跑类型队列（第 66 轮补：Satisfies 漏挂了队列）
// xl:expect Satisfies:2,ArrayType,UnionType
const y = [1, 2] satisfies number[]
const z = a satisfies A | B
