// xl:note 对象类型字面量里的方法签名：类型位的那对花括号现在是 TypeLiteral，
// 方法成员按成员规则收成 MethodDeclaration（而不是旧的 Method + Keyword）
// xl:expect TypeAssign,TypeLiteral,TypeLiteralBody,MethodDeclaration
type X = { m(): void }
