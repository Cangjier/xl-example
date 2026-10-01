// xl:note 声明尾部的换行是终点：上一行的函数类型不能把下一行的 `type B<…>` 吞进去
// xl:expect FunctionType:2
// xl:absent Method
type A<in T> = (x: T) => void
type B<out T> = () => T
