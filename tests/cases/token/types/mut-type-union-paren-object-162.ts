// xl:note 括号里的联合类型：第一个 `{` 也要判成类型位（原来第一个是 ObjectLiteral、第二个才是 TypeLiteral）
// xl:expect TypeLiteral:2,TypeLiteralBody:2,Field:2,UnionType
type T = A & (/* c */{ readonly ok: true } | { readonly no: true })
