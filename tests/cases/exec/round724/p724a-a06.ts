// xl:title 展开的几种来路：标识符 / 数组字面量 / 字符串 / Set / 生成器 / 迭代器
// xl:round 724
// xl:judge stdout
// xl:end
function f(...a: any[]) { return a.length + ":" + a.join("|"); }
const xs: any = [1, 2];
function* gen() { yield 1; yield 2; }
console.log(f(...xs));
console.log(f(...[1, 2] as any));
console.log(f(..."ab" as any));
console.log(f(...(new Set([1, 2]) as any)));
console.log(f(...(gen() as any)));
console.log(f(...([1, 2].values() as any)));
console.log(f(...(new Map([[1, 2]]).keys() as any)));
