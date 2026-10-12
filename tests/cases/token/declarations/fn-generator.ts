// xl:expect Function,Keyword
// xl:note 基线用例（来自缺口审计语料）
function* g() {
  yield 1
  yield* other()
}
