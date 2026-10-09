// xl:note 类型参数变型标注 in / out（in 与 out 都不在 Keyword 表内），且声明尾部的换行是终点：上一行的函数类型不能把下一行的 `type B<…>` 吞进去
// xl:expect FunctionType:2,TypeAssign,GenericType
// xl:absent Method
// **合并**（第 784 轮）：token/types/type-fn-declaration-boundary.ts —— 同一份 source 喂给同一把 AST 尺子，判定点只有一个，期望已并在这一条里。
type A<in T> = (x: T) => void
type B<out T> = () => T
