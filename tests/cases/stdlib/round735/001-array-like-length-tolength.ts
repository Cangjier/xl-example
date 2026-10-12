// xl:title Array.from 与类数组接收者的 length 走 ToLength：小数截断、数字文本、访问器与越界
// xl:round 735
// xl:judge stdout
// xl:end
// **按判定点合并**：把 stdlib/round735 里同判定点的 4 条探针并成这一条。
// `Array.from` 与类数组接收者（`ArrayLikeLength`）是**同一格根的两处实现**，所以并成一条；
// 正文逐字搬进各自的 IIFE（打印口径与判据一字未动），输出逐行等于原来那些条之和。
// `p735a-a40` 是同一批改动的回归哨：它的 `JSON.parse(-0)` 与 `Map` 抛那两组是
// `p735a-a30` / `p735a-a32` 的重抄（守卫），**原样保留在本条**，判定点没变。
//   · stdlib/round735/p735a-a10.ts
//   · stdlib/round735/p735a-a10b.ts
//   · stdlib/round735/p735a-a10c.ts
//   · stdlib/round735/p735a-a40.ts

// ===== 吸收 stdlib/round735/p735a-a10.ts =====
(() => {
// **这一条量的是一个静默错值**：`{ length: 2.5 }` 的 `ToLength` 是 **2**，
// 而本仓原来走 `AsInt()`——那个方法对 `Float64` 给 `0` ⇒ 一条都不读（给 `[]`）。
const a: any = { length: 2.5, 0: "a", 1: "b", 2: "c" };
console.log(Array.from(a).join(","));
console.log(Array.from(a).length);
const b: any = { length: 0.9, 0: "a" };
console.log(Array.from(b).length);
const c: any = { length: -1, 0: "a" };
console.log(Array.from(c).length);
console.log(Array.from({ length: -2.5, 0: "a" } as any).length);
console.log(Array.from({ length: "3" } as any).length);
console.log(Array.from({ length: 2 } as any).length);
console.log(Array.from({ length: 3, 2: "c" } as any).join(","));
})();

// ===== 吸收 stdlib/round735/p735a-a10b.ts =====
(() => {
// 同一格根在**类数组接收者**那一侧也各写了一份（`ArrayLikeLength`）——
// `slice.call({ length: 2.5 })` 原来给 `[]`、Node 给两项。
const o: any = { length: 2.5, 0: "a", 1: "b", 2: "c" };
console.log(Array.prototype.slice.call(o).join(","));
console.log(Array.prototype.join.call(o, "-"));
console.log(Array.prototype.indexOf.call(o, "b"));
console.log(Array.prototype.map.call(o, (v) => v + "!").join(","));
console.log(Array.prototype.slice.call({ length: 0.9, 0: "a" } as any).length);
console.log(Array.prototype.slice.call({ length: -2 } as any).length);
})();

// ===== 吸收 stdlib/round735/p735a-a10c.ts =====
(() => {
// 两格都收到 `ArrayLikeLength` 那一条 `ToLength(Get(O, "length"))` 上：
//   · `"3"` 这种数字文本原来不认 ⇒ 给 **0** 项（Node 读三项）；
//   · 访问器那一格原来被 `continue` 跳过 ⇒ 落到「不是数组式」⇒ 走迭代器那条路。
const s: any = { length: "3", 0: "a", 1: "b", 2: "c" };
console.log(Array.from(s).join(","));
console.log(Array.from({ length: "2.7", 0: "a", 1: "b", 2: "c" } as any).join(","));
console.log(Array.from({ length: "0.9", 0: "a" } as any).length);
console.log(Array.from({ length: -1 } as any).length);
const withGet: any = { get length() { return 2; }, 0: "x", 1: "y" };
console.log(Array.from(withGet).join(","));
console.log(Array.from({ get length() { return 0; } } as any).length);
console.log(Array.prototype.slice.call(s).join(","));
console.log(Array.prototype.slice.call({ length: "2.7", 0: "a", 1: "b" } as any).join(","));
console.log(Array.prototype.slice.call(withGet).join(","));
})();

// ===== 吸收 stdlib/round735/p735a-a40.ts =====
(() => {
// 与上面几条一起进语料：**同一批改动**碰过的几格，
// 免得日后有人只修一半（`ArrayLikeLength` 与 `Array.from` 各有一份判据）。
console.log(Array.from({ length: 2.5, 0: "a", 1: "b", 2: "c" } as any).join(","));
console.log(Object.is(JSON.parse("-0"), -0), 1 / JSON.parse("-0"));
console.log(Object.is(JSON.parse("0"), -0));
try { new Map([1] as any); console.log("no-throw"); } catch (e: any) { console.log(e.constructor.name); }
console.log(JSON.stringify([...new Map([[1, 2, 3]] as any)]));
console.log(Array.from(new Set([1, 2])).join(","));
})();
