// xl:note 对象类型里的取值器与设值器签名：`get` / `set` 折进 MethodDeclaration 的 Modifiers，
// 不再各自落成一个 Keyword 节点
// xl:expect TypeAssign,TypeLiteral,TypeLiteralBody,MethodDeclaration,TypeDefine
type X = { get a(): number; set a(v: number) }
