// xl:note 括号里的联合类型：第一个 `{` 也要判成类型位（原来第一个是 ObjectLiteral、第二个才是 TypeLiteral）
// xl:expect TypeLiteral,TypeLiteralBody,UnionType,ObjectLiteral
// xl:known-gap 注释夹在括号里联合类型第一个 `{` 之前：那一格被当成值位的对象字面量（r660 探针池 mut-type-union-paren-object-162）
type T = A & (/* c */{ readonly ok: true } | { readonly no: true })
