// xl:note 基线用例（来自缺口审计语料）
// xl:expect Lamda,LamdaBody,LamdaParameters,PropertyAccess
const m = await import("x")
const n = import("y").then(r => r.default)
