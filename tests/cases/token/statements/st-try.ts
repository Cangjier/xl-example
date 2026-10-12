// xl:expect Try,TryBody,CatchBody,FinallyBody
// xl:note 基线用例（来自缺口审计语料）
try {
  a()
} catch (e) {
  b()
} finally {
  c()
}
