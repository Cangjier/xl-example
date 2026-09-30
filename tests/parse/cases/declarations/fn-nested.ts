// xl:expect Function
// xl:note 基线用例（来自缺口审计语料）
function outer() {
  function inner() {
    return 1
  }
  return inner
}
