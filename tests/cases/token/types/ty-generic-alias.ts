// xl:note 基线用例（来自缺口审计语料）
// xl:expect TypeLiteral,TypeLiteralBody
type A<T extends object = {}> = T | null
type B<T = any> = Array<T>
