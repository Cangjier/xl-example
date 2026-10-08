// xl:note 类型运算符 `readonly` 与它的操作数之间夹一条注释
// xl:expect TypeAssign,Keyword
// xl:known-gap 注释夹在 `readonly` 与 `string[]` 之间：`readonly` 被当成类型引用、`ArrayType` 挂到了整段上（区间从头算起），操作数那一半缺（r676 探针 readonly-comment-operand）
type K = readonly /* c */ string[];
