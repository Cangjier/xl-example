// 第 149 轮：四个「Node 跑得动、本仓跑不了」的小口子
//（数值常量 · 幂 · `typeof` 未声明的名字 · 两个全局判定）
//
// 这一轮的选题口径换了一次：**按「Node 跑得动而我们跑不了」排**。
// 上一轮量到的 `enum` 与运行期 `namespace` 都在这个口径之外 ——
// **Node 自己就拒绝运行它们**（type stripping 不做变换，直接报错），
// 所以「与 Node 逐字节相同」这条判据对它们**没有意义**，优先级因此掉下来。
//
// 这一份量的是端到端：`tsrun` 的 stdout 与 `node` 逐字节相同。

// ① `NaN` / `Infinity` 两个全局名（原来让整份文件在降级期失败）
console.log(NaN, Infinity, -Infinity, 1 / 0, 0 / 0);
console.log(Number.isInteger(NaN), Number.isFinite(Infinity), isFinite(NaN));
console.log(isNaN("abc"), Number.isNaN("abc"), isFinite("3"), Number.isFinite("3"));

// ② `**`（幂）：四个形状 + `**=` 三种左值
console.log(2 ** 10, 2 ** 0.5, 9 ** 0.5, (-2) ** 3, 2 ** -1);
let acc = 3;
acc **= 2;
const boxed = { v: 2 };
boxed.v **= 5;
const cells = [2];
cells[0] **= 3;
console.log(acc, boxed.v, cells[0]);

// ③ `typeof` 一个没声明的名字（特性检测那一族）
console.log(typeof window, typeof notDeclaredAnywhere);
let local = 1;
console.log(typeof local, typeof console, typeof String(3), typeof globalThis);
console.log("guard", typeof window !== "undefined" ? "browser" : "node");

// ④ `globalThis` 指向那个环境对象自己
console.log(globalThis.Math === Math, globalThis.NaN === NaN);
