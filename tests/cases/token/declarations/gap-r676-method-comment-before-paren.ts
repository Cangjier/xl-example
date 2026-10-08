// xl:note 类方法的成员名与形参括号之间夹一条注释
// xl:expect Class,ClassBody,Bracket,TypeLiteral,TypeLiteralBody
// xl:known-gap 注释夹在成员名与形参表之间：`()` 被当成类型位的括号（未映射 Bracket），`MethodDeclaration` 与它的 `Block` 都不成形（r676 探针 method-comment-before-paren）
class A { m /* c */ (): void {} }
