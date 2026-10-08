// xl:title 带类型标注的箭头函数立即调用（括号那两种形状）
// xl:round 305
// xl:judge stdout
// xl:end

console.log(((a: number, b: number) => a + b)(1, 2));
const add = (a: number, b: number): number => a + b;
console.log(add(3, 4));
console.log(((x: string) => x.toUpperCase())("ab"));
