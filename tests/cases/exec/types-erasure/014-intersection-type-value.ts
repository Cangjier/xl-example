// xl:title 交叉类型：值位只是对象字面量
// xl:judge stdout
// xl:end

type A = { a: number };
type B = { b: number };
const ab: A & B = { a: 1, b: 2 };
console.log(ab.a + ab.b);
