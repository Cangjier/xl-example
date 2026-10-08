// xl:note ASI：return 换行后跟表达式 —— 受限产生式，等于 return; 加一条表达式语句
// xl:expect Function,FunctionBody,Statement
// xl:known-gap `function f(/* c */)` 里那条注释让 ASI 那一族的形态漂一格（r660 探针池 mut-stmt-asi-return-newline-expr-115）
function f(/* c */) {
  return
  1
  g()
}
