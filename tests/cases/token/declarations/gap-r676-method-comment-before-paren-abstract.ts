// xl:note 抽象方法（无体签名）的成员名与形参括号之间夹一条注释
// xl:expect Class,ClassBody,Signature,Bracket,ReturnType
// xl:known-gap 注释夹在成员名与形参表之间：`MethodDeclaration` 缺，形参表单独落成 `CallSignature`（与类里那条同族，签名形态另立一条，r676 探针 method-comment-before-paren-abstract）
abstract class A { abstract m /* c */ (): void; }
