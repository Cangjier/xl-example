// xl:note 函数里嵌套函数声明
// xl:expect Function,FunctionBody
function outer() {
  function inner() {
    return 1
  }
  return inner()
}
