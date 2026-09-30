// xl:note 类型参数变型标注 in / out（in 与 out 都不在 Keyword 表内）
// xl:expect TypeAssign,GenericType
type A<in T> = (x: T) => void
type B<out T> = () => T
