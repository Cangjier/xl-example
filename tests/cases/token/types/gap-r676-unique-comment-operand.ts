// xl:note 类型运算符 `unique` 与它的操作数之间夹一条注释
// xl:expect Keyword
// xl:known-gap 注释夹在 `unique` 与 `symbol` 之间：`TypeOperator` 的区间只到自己（漂移），`unique` 还被额外投成一次类型引用与标识符，操作数缺（r676 探针 unique-comment-operand）
declare const s: unique /* c */ symbol;
