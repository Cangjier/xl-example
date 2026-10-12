// xl:title 冻结之后 `defineProperty`（元素格与 `length` 格）都抛
// xl:round 723
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round723 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round723/p723a-a08.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
run(() => { Object.defineProperty(a, "1", { value: 9 }); console.log("ok:" + a[1]); });
run(() => { Object.defineProperty(a, "4", { value: 9 }); console.log("new:" + a.length); });
console.log(show(a[1]) + "," + show(a.length));
})();

// ===== 吸收 stdlib/round723/p723a-a11.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log("ok:" + a.length); });
run(() => { Object.defineProperty(a, "length", { writable: true }); console.log("rw:" + a.length); });
console.log(show(a.length) + "," + show(a.join(",")));
})();
