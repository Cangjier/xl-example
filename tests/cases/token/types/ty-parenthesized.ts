// xl:note 基线用例（来自缺口审计语料）
// xl:expect TypeLiteral,TypeLiteralBody
type A = (string | number)[]
type B = ((x: number) => void) | null
type C = { a: 1 }["a"]
