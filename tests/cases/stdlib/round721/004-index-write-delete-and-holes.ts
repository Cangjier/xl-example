// xl:title 下标那一格的写 / 删 / 留洞：不可写、不可配置、`delete` 与 `concat` / `slice`
// xl:round 797
// xl:judge stdout
// xl:end
// **按判定点并组（第 797 轮）**：把 stdlib/round721 里同判定点的 4 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round721/p721a-a05.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9, writable: false });
a[1] = 42;
console.log(show(a[1]) + "," + show(a.length) + "," + show(a.join(",")));
})();

// ===== 吸收 stdlib/round721/p721a-a06.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9, configurable: false, enumerable: true });
console.log(show(delete a[1]) + "," + show(a[1]) + "," + show(a.length) + "," + show(a.hasOwnProperty("1")) + "," + show("1" in a));
})();

// ===== 吸收 stdlib/round721/p721a-a14.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
console.log(show(delete a[1]) + "," + show(a.length) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join(",")) + "," + show(a.hasOwnProperty("1")));
})();

// ===== 吸收 stdlib/round721/p721a-a17.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
delete a[1];
console.log(show(a.concat([4]).join(",")) + "," + show(a.slice().length) + "," + show(1 in a.slice()));
})();
