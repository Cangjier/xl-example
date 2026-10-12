// xl:title 设原型的接收者那一格：`Object` 对原始值原样返回、`null` / `undefined` 抛，`Reflect` 一律抛
// xl:round 720
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round720 里同判定点的 3 条探针并成这一条。
// 正文（含探针自己的 `show` / `t` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round720/p720a-s02.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Object.setPrototypeOf(1 as any, {})));
console.log(t(() => Object.setPrototypeOf("s" as any, {})));
console.log(t(() => Object.setPrototypeOf(true as any, {})));
})();

// ===== 吸收 stdlib/round720/p720a-s03.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Object.setPrototypeOf(null as any, {})));
console.log(t(() => Object.setPrototypeOf(undefined as any, {})));
})();

// ===== 吸收 stdlib/round720/p720a-s06.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Reflect.setPrototypeOf(1 as any, {})));
console.log(t(() => Reflect.setPrototypeOf(null as any, {})));
})();
