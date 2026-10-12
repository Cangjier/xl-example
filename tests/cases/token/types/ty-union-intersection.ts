// xl:note 基线用例（来自缺口审计语料）
// xl:expect TypeLiteral,TypeLiteralBody
type A = string | number & { b: 1 }
type B = (string | number)[]
