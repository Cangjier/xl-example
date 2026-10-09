// xl:note ASI：return 换行后跟表达式 —— 受限产生式，等于 return; 加一条表达式语句
// xl:expect Function,FunctionBody,Statement
function f(/* c */) {
  return
  1
  g()
}
