// xl:title 闭包捕获：循环里的 `let` / `const of` / 函数作用域
// xl:round 747
// xl:judge stdout
// xl:end
// 本文件是 `p747a-a03` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const fnsLet: Array<() => number> = [];
for (let i = 0; i < 3; i++) fnsLet.push(() => i);
console.log(fnsLet.map((f) => f()).join(","));
const fnsOf: Array<() => number> = [];
for (const n of [1, 2, 3]) fnsOf.push(() => n);
console.log(fnsOf.map((f) => f()).join(","));
function counter() { let n = 0; return () => ++n; }
const c1 = counter();
const c2 = counter();
console.log(c1(), c1(), c2());
const fnsWhile: Array<() => number> = [];
let w = 0;
while (w < 2) { const k = w; fnsWhile.push(() => k); w++; }
console.log(fnsWhile.map((f) => f()).join(","));
