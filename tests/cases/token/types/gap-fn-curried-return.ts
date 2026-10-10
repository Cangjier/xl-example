// xl:note 柯里化的函数类型：返回类型那一段自己也是函数类型（token 层按第 141 行的口径整段收在一个节点里）
// xl:round 927
// xl:known-gap 返回类型那一段是平铺的 `(` `=>` `T` 三格，`projectTypeExpression` 不认这形状（缺里层 `FunctionType` + `VoidKeyword`、多一个裸 `Bracket`）
// xl:end
type T = () => () => void;
