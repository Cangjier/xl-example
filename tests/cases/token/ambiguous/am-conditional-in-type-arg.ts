// xl:note 基线用例（来自缺口审计语料）
// xl:expect ConditionalType,LiteralType,TypeParameter,GenericType
type A<T> = Map<T extends string ? 1 : 2, T>
