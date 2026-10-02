// xl:note `||` 的符号与两个操作数**在同一个** LogicalOperator 里（第 71 轮起符号进树）
// xl:expect IfSet,IfSegment,IfCondition,LogicalOperator:1,SymbolToken
if (a || b) {
  c()
}
