// xl:note 默认参数（含引用前面参数的默认值）
// xl:expect Function,FunctionBody
function f(a = 1, b = a + 1) {
  return a + b
}
