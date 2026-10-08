// xl:note 默认值与剩余形参同在：`(a, b = 1, ...c)` 也是三个形参
// xl:expect Lamda,Parameter:3
// xl:absent BinaryOperator
const f = (a, b = 1, ...c) => a
