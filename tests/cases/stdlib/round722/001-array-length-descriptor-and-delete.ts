// xl:title 数组 `length` 那一格的描述符三格与 `delete a.length` 给假、长度不动
// xl:round 722
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round722 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round722/p722a-a01.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
console.log(show(delete a.length) + "," + show(a.length) + "," + show(a.join(",")));
console.log(show(Object.getOwnPropertyDescriptor(a, "length").configurable));
})();

// ===== 吸收 stdlib/round722/p722a-a14.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
console.log(show(Object.getOwnPropertyDescriptor([], "length").writable)
  + "," + show(Object.getOwnPropertyDescriptor("ab", "length").writable)
  + "," + show(Object.getOwnPropertyDescriptor([], "length").enumerable)
  + "," + show(Object.getOwnPropertyDescriptor([], "length").configurable));
})();
