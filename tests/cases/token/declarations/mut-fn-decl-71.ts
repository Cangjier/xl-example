// xl:expect Function,FunctionBody
// xl:note 基线用例（来自缺口审计语料）
// xl:known-gap 注释夹在函数名与它的参数表之间：`Function` 认不出那个 `(`（r660 探针池 mut-fn-decl-71）
function f/* c */(a, b) {
  return a + b
}
