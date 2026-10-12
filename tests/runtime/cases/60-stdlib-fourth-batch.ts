// 第 182 轮：**标准库第四批**（`valueOf` · `toPrecision` · `Object.freeze` ·
// `Object.defineProperty` · `Array.from({length}, fn)`）。
//
// 五格都是普查里「Node 跑得动、本仓跑不了」的那一簇，而且**五格一个引擎改动都不用**：
//
//  ① `Number.prototype.toPrecision` —— 与 `toFixed` **同族同一条理由**（语义由 ECMAScript
//     逐字定死、手写一遍会错在边界上），所以同样**借宿主**；
//  ② `Number.prototype.valueOf` / `Boolean.prototype.valueOf` —— `ToPrimitive` 的第一步
//     就是「原始值给回自己」，所以**连转换都不做**；
//  ③ `Object.freeze` —— 属性表里**早就有** `writable` 标志，而 `SetProperty` 见到不可写的
//     属性**本来就会抛**；所以冻结只是把标志清掉；
//  ④ `Object.defineProperty` —— 同一组标志的**另一半**（从描述符拼出三个标志，
//     JS 的默认是三个 `false`）；数据属性描述符走完，`get`/`set` 响亮地抛；
//  ⑤ `Array.from({length}, fn)` —— 数组式（有 `length` 的普通对象）+ 映射函数。
//
// **顺带修掉两处「标志位一直没人看」**：`Object.keys` / `values` / `entries` / `assign`
// 与 `JSON.stringify` 原来**一个标志都不看**——在 `defineProperty` 落地之前，
// 所有属性的 `enumerable` 都是真，所以这一格量不出来；落地当天判据当场变红。
//
// **还有一处是这一轮撞出来的**：`{ length: 3 }` 这种字面量**根本造不出来**——
// `SetProperty` 见到 `length` 就抛「只读的 length」，而那条规矩**只该管数组**。

// ① 原始值上的 valueOf 与 toPrecision
console.log((5).valueOf(), true.valueOf(), (1.5).valueOf());
console.log((1.2345).toPrecision(3), (123.456).toPrecision(4), (0.0001234).toPrecision(2));

// ② Object.freeze：读得到，而且写不进去（本仓在严格语义下抛）
const frozen = Object.freeze({ a: 1, b: 2 });
console.log(frozen.a, Object.keys(frozen).length, JSON.stringify(frozen));

// ③ Object.defineProperty：默认三个标志都是 false（**最容易写反的一格**）
const defined: any = {};
Object.defineProperty(defined, "x", { value: 1 });
Object.defineProperty(defined, "y", { value: 2, enumerable: true, writable: true });
defined.y = 3;
console.log(defined.x, Object.keys(defined).join(","), JSON.stringify(defined));
console.log(Object.values(defined).length, Object.assign({}, defined).y);

// ④ Array.from：数组式 + 映射函数（回调给的是「值, 下标」）
console.log(Array.from({ length: 3 }, (_: any, i: number) => i).join(","));
console.log(Array.from([1, 2, 3], (v: any) => v * 2).join(","));
console.log(Array.from({ length: 2, 0: "a", 1: "b" }).join(","));

// ⑤ 回归：`length` 在数组上照旧是那一格特殊的（截断），在普通对象上只是普通属性
const arr: any = [1, 2, 3];
arr.length = 2;
const box: any = { length: 3 };
console.log(arr.join(","), box.length);
