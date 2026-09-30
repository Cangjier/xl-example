// xl:note 只读索引签名：`readonly` 折进 Field 的 Modifiers，不再单独落成一个 Keyword 节点；
// 名字 `k` 进 FieldName，键类型那段是子单元里的 JsonArray
// xl:expect TypeAssign,TypeDefine,TypeLiteral,TypeLiteralBody,Field
type X = { readonly [k: string]: number }
