// xl:note 调用表达式上的类型实参 f<T>(1)
// xl:expect Function,GenericType,Method
declare function f<T>(x: T): T
const y = f<number>(1)
