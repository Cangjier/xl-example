// xl:expect Function
// xl:note 基线用例（来自缺口审计语料）
function assertA(x: unknown): asserts x is A {}
function assertB(x: unknown): asserts x {}
