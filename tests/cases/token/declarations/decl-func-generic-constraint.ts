// xl:note 泛型类型参数带约束 <T extends object>
// xl:expect Function,FunctionBody,GenericType
function f<T extends object>(x: T): T {
  return x
}
