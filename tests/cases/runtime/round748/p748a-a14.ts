// xl:title 闭包：`var` 的共享格与 `let` 的每轮新格
// xl:round 748
// xl:judge stdout
// xl:end
const a: Array<() => number> = [];
for (var i = 0; i < 3; i++) a.push(() => i);
console.log(a.map((f) => f()).join(","));
const b: Array<() => number> = [];
for (let j = 0; j < 3; j++) b.push(() => j);
console.log(b.map((f) => f()).join(","));
const c: Array<() => number> = [];
for (const k of [1, 2, 3]) c.push(() => k);
console.log(c.map((f) => f()).join(","));
let d: Array<() => number> = [];
{ for (let m = 0; m < 2; m++) d.push(() => m); }
console.log(d.map((f) => f()).join(","));
