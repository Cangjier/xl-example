// xl:expect Function,FunctionBody
// xl:note 基线用例（来自缺口审计语料）
// xl:known-gap 注释夹在二元运算符与操作数之间：整条 `BinaryOperator` 不成形（r660 探针池 mut-fn-decl-90）
function f(a, b) {
  return a/* c */ + b
}
