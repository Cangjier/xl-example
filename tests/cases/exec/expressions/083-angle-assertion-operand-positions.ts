// xl:title 尖括号断言 `<T>x` 出现在各种操作数位置上
// xl:round 379
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// TS 里 `<T>x` 是**前缀**那一档（与 `!x` 同一档），所以它前面的位置上
// 一个左操作数都没有——那些位置**全是**操作数位置，断言都成立。
const a: unknown = 1;
const b: unknown = 2;
console.log("A", <number>a + <number>b, <number>a - <number>b, <number>a * <number>b);
console.log("B", a ? <number>b : <number>a);
console.log("C", (<number>a), ((<number>a) + 1) * <number>b);
const c = <number>a + <number>b + <number>a;
console.log("D", c, <number>a < <number>b);
let d: unknown = 5;
d = <number>d + 1;
console.log("E", d, <string>"x" + "y");
function pick(v: unknown): number {
  return <number>v * 2;
}
console.log("F", pick(a), pick(3));
const arr = [<number>a, <number>b];
console.log("G", arr.join(","));
console.log("H", <number>a === 1, <number>a !== 2);
