// xl:note 映射类型的 ? 与 readonly 修饰（两个紧密相关变体共用一个用例）
// xl:expect TypeAssign,Keyword,MappedType
type X = { [K in keyof T]?: T[K] }
type Y = { readonly [K in keyof T]: T[K] }
