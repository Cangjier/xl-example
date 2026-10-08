// xl:note 内层函数里的 return 属于内层函数体
// xl:expect Function,FunctionBody,Statement
function outer() {
  function inner() {
    return 1
  }
  return inner()
}
