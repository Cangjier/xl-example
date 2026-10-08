// xl:expect Keyword
// xl:note 基线用例（来自缺口审计语料）
async function f() {
  const a = await g()
  const b = await (h())
}
function* gen() {
  const c = yield
  const d = yield 1
  const e = yield* other()
}
