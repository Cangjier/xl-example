// xl:note 可选参数 / 默认值 / 剩余参数：a?: 不能被当成三元运算符
// xl:expect Lamda
// xl:absent TernaryOperator
const f = (a?: number, b = 1, ...c: number[]) => a;
