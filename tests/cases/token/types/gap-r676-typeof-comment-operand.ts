// xl:note 类型查询 `typeof` 与它的操作数之间夹一条注释
// xl:expect TypeAssign,Keyword
// xl:known-gap 注释夹在 `typeof` 与操作数之间：类型查询整条缺（与 `keyof` 那条同族，`TypeQuery` 这一支同样只看紧邻，r676 探针 typeof-comment-operand）
type K = typeof /* c */ a;
