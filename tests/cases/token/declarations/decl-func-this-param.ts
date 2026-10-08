// xl:note this 参数（只存在于类型层的参数）
// xl:expect Function,FunctionBody
function f(this: Window, x: number) {
  return x
}
