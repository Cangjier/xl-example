// xl:title `freeze` 之后写已有下标静默、值不动，读通道（`keys` / `JSON` / 迭代 / `map`）照旧
// xl:round 723
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round723 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round723/p723a-a01.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
a[1] = 9;
console.log(show(a[1]) + "," + show(a.join(",")) + "," + show(JSON.stringify(a)));
})();

// ===== 吸收 stdlib/round723/p723a-a09.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
console.log(show(Object.keys(a).join(",")) + "," + show(JSON.stringify(a)) + "," + show([...a].join(",")) + "," + show(a.map((x) => x).join(",")));
})();
