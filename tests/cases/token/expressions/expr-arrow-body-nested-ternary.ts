// xl:note 箭头函数体里的嵌套三元：`<` 是运算符、不是泛型实参（第 178 轮）
// xl:expect TernaryOperator,Lamda
// xl:absent GenericType
const cmp = (x: number, y: number) => (x < y ? -1 : x > y ? 1 : 0);
const cmp2 = (x: number, y: number) => x < y ? -1 : x > y ? 1 : 0;
type F = (a: number, b: number) => number;
const g: F = (a, b) => (a < b ? a : b);
const h = [1, 2].sort((x, y) => (x < y ? -1 : 1));
