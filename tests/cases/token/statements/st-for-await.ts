// xl:expect Foreach,Keyword
// xl:note 基线用例（来自缺口审计语料）
async function f() {
  for await (const v of xs) {}
}
