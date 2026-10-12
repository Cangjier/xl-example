// xl:note 委托产生式 `yield*`：`*` 不是乘法（TS 那边是带 asteriskToken 的 YieldExpression）
// xl:expect Keyword
// xl:absent BinaryOperator
function* g() {
  yield* h()
}
