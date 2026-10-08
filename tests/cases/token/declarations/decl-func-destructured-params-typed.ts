// xl:note 带对象类型注解 + 默认值的解构参数
// xl:expect Function,FunctionBody,TypeLiteral,TypeLiteralBody
function f({ a, b }: { a: number; b: number } = { a: 0, b: 0 }) {
  return a + b
}
