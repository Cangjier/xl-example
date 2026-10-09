// xl:title `freeze` / `seal` / `preventExtensions` 之后加不下新元素：赋值静默、`push` 抛
// xl:round 723
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round723 里同判定点的 2 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round723/p723a-a04.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const free = [1];
Object.freeze(free);
free[1] = 2;
console.log("frozen", show(free.length) + "," + show(free[1]) + "," + show(JSON.stringify(free)));
const sealed = [1];
Object.seal(sealed);
sealed[1] = 2;
console.log("sealed", show(sealed.length) + "," + show(sealed[1]));
const pe = [1];
Object.preventExtensions(pe);
pe[1] = 2;
console.log("preventExtensions", show(pe.length) + "," + show(pe[1]));
})();

// ===== 吸收 stdlib/round723/p723a-a05.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const free = [1];
Object.freeze(free);
run(() => { free.push(2); console.log("f:" + free.length); });
const sealed = [1];
Object.seal(sealed);
run(() => { sealed.push(2); console.log("s:" + sealed.length); });
const pe = [1];
Object.preventExtensions(pe);
run(() => { pe.push(2); console.log("p:" + pe.length); });
})();
