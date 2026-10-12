// xl:title 削短再长回来是洞、削短之后还能往后写
// xl:round 722
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round722 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round722/p722a-a04.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { value: 1 });
Object.defineProperty(a, "length", { value: 3 });
console.log(show(a.length) + "," + show(a[1]) + "," + show(JSON.stringify(a)) + "," + show(1 in a));
})();

// ===== 吸收 stdlib/round722/p722a-a05.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { value: 1 });
a.push(9);
console.log(show(a.length) + "," + show(a.join(",")) + "," + show(a[1]));
})();
