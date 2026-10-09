// xl:title `delete`：数组元素 / 不可配置属性 / 冻结对象 / 变量
// xl:round 691
// xl:judge stdout
// xl:end
// 第 787 轮把同判定点的探针并进来（正文逐句搬入；只把**独有的断言**留下）：
//   · exec/expressions/probe698-g01 · g02 · g03 · g06 · g07 · g08
//   · exec/expressions/probe704-x-b30
// 判据只有一条：`delete` 的返回值与它到底删掉了什么——删数组的一格会**留下洞**
// （`length` 不变、`in` 变假、`Object.keys` 少一格、`join` 印空），不可配置的属性
// 与非严格模式下的冻结属性都**删不掉但不抛**。
const a: any = [1, 2, 3];
delete a[1];
console.log(a.length, JSON.stringify(a), 1 in a);
const o: any = {};
Object.defineProperty(o, "x", { value: 1, configurable: false });
console.log(delete o.x, "x" in o);
console.log(delete (globalThis as any).nothing);

// 第 787 轮并进来的落点
console.log((function () { const xs = [1, 2, 3]; delete xs[1]; return [xs.length, xs[1], 1 in xs, Object.keys(xs).join(",")].join("|"); })());
console.log((function () { const o = { a: 1 }; return [delete o.a, "a" in o, o.a].join("|"); })());
console.log((function () { const o = Object.freeze({ a: 1 }); return [delete o.a, o.a].join("|"); })());
console.log((function () { const o = {}; Object.defineProperty(o, "a", { value: 1, configurable: false }); return delete o.a; })());
console.log((function () { const o = { a: 1 }; delete o.a; return Object.keys(o).length; })());
console.log((function () { const xs = [1, 2]; delete xs[0]; return xs.join(","); })());
console.log((function () { return delete ({}).a; })());
