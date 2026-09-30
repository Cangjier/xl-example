// xl:note 泛型类型参数带 const 修饰符 <const T>
// xl:expect Function,FunctionBody,GenericType
function f<const T>(x: T): T {
  return x
}
