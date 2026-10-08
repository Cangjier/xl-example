// xl:note 只读索引签名：`readonly` 作为子单元进 IndexSignature（那一趟升级成 Keyword），
// 不再是 Field 的 modifiers 属性；参数名与两种类型都在成员里（第 66 轮第五批）
// xl:expect TypeAssign,TypeDefine,TypeLiteral,TypeLiteralBody,IndexSignature,Keyword
type X = { readonly [k: string]: number }
