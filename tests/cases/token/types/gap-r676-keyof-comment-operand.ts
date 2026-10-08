// xl:note 类型运算符 `keyof` 与它的操作数之间夹一条注释
// xl:expect TypeAssign,Keyword
// xl:known-gap 注释夹在 `keyof` 与操作数之间：`TypeOperator` 的区间只到自己（漂移），操作数那半落成散单元、`T` 的引用与名称都缺（映射键那一格已登记，这里是类型别名右侧的裸位置，r676 探针 keyof-comment-operand）
type K = keyof /* c */ T;
