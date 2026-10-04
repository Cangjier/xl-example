// xl:note 数组字面量里的箭头函数：逗号是元素分隔符，不能被体的范围吞掉（第 178 轮）
// xl:expect ArrayLiteral,Lamda,PropertyAccess,Method
const xs = [() => 1, () => 2];
const ys = [(n: number) => n * 2, (n: number) => n + 1];
const zs = [1, () => 2, 3];
const ws = { a: () => 1, b: 2 };
call(() => 4, 5);
