// xl:note 基线用例（来自缺口审计语料）
// xl:expect InferType,ConditionalType,TypeParameter,GenericType
type C<T> = T extends Array<infer U> ? U : never
type D<T> = T extends infer U extends string ? U : never
