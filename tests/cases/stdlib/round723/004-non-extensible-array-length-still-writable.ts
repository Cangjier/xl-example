// xl:title `preventExtensions` / `seal` 之后 `length` 那一格还能改（削短与加长）
// xl:round 723
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round723 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round723/p723a-a06.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.preventExtensions(a);
a.length = 1;
console.log(show(a.length) + "," + show(a.join(",")));
const b = [1, 2, 3];
Object.preventExtensions(b);
b.length = 5;
console.log(show(b.length) + "," + show(JSON.stringify(b)));
})();

// ===== 吸收 stdlib/round723/p723a-a10.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.seal(a);
a.length = 4;
console.log(show(a.length) + "," + show(JSON.stringify(a)));
run(() => { a.push(9); console.log("pushed:" + a.length); });
})();
