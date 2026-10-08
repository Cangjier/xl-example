// xl:note 基线用例（来自缺口审计语料）
// xl:expect LiteralType,UnionType,GenericType,TypeAssign
type A = NonNullable<string | null>
type B = string | undefined
