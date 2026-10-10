// token: TypePredicate
// xl:expect Function
// xl:note 基线用例（来自缺口审计语料）
function isA(x: unknown): x is A {
  return true
}
