// xl:title `length` 跟着长的那两条路（define 与赋值）与**不是下标**的键
// xl:round 797
// xl:judge stdout
// xl:end
// **按判定点并组（第 797 轮）**：把 stdlib/round721 里同判定点的 3 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round721/p721a-a07.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "5", { value: 6 });
console.log(show(a.length) + "," + show(a[5]) + "," + show(a.join(",")) + "," + show(JSON.stringify(a)));
const b = [1];
b[4] = 5;
console.log(show(b.length) + "," + show(Object.keys(b).join(",")));
})();

// ===== 吸收 stdlib/round721/p721a-a08.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "01", { value: 4 });
Object.defineProperty(a, "1.5", { value: 5 });
Object.defineProperty(a, "-1", { value: 6 });
Object.defineProperty(a, "4294967295", { value: 7 });
console.log(show(a.length) + "," + show(a["01"]) + "," + show(a["4294967295"]) + "," + show(Object.keys(a).length));
})();

// ===== 吸收 stdlib/round721/p721a-b08.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [];
Object.defineProperty(a, "1", { get() { return 5; }, enumerable: true, configurable: true });
console.log(show(a.length) + "," + show(a[1]) + "," + show(JSON.stringify(a)));
})();
