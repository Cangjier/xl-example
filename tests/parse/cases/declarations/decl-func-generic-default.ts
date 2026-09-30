// xl:note 泛型类型参数带默认值 <T = string>
// xl:expect Function,FunctionBody,GenericType
function f<T = string>(x: T): T {
  return x
}
