// xl:note 接口里方法签名的成员名与形参括号之间夹一条注释
// xl:expect Interface,InterfaceBody,Signature,Bracket,ReturnType
// xl:known-gap 注释夹在成员名与形参表之间：`MethodSignature` 缺，形参表单独落成 `CallSignature`（r676 探针 method-comment-before-paren-signature）
interface I { m /* c */ (): void; }
