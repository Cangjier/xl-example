// xl:note 无类型注解的对象解构参数与数组解构参数
// xl:expect Function,FunctionBody
function f({ a, b }, [c, d]) {
  return a + b + c + d
}
