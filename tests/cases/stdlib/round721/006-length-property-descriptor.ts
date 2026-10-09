// xl:title `length` 那一格：描述符回读、define 的削短与加长、不可写之后的静默与 `TypeError`
// xl:round 797
// xl:judge stdout
// xl:end
// **按判定点并组（第 797 轮）**：把 stdlib/round721 里同判定点的 6 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round721/p721a-a09.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
const d = Object.getOwnPropertyDescriptor(a, "length");
console.log(show(d.value) + "," + show(d.writable) + "," + show(d.enumerable) + "," + show(d.configurable));
})();

// ===== 吸收 stdlib/round721/p721a-a10.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { writable: false });
run(() => { a.push(3); console.log("pushed:" + a.length); });
})();

// ===== 吸收 stdlib/round721/p721a-a11.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { enumerable: false }); console.log(show(a.length) + "," + show(a.join(","))); });
})();

// ===== 吸收 stdlib/round721/p721a-b04.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { value: 1 });
console.log(show(a.length) + "," + show(a[1]) + "," + show(a[2]) + "," + show(Object.keys(a).join(",")) + "," + show(JSON.stringify(a)));
})();

// ===== 吸收 stdlib/round721/p721a-b05.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { value: 4 });
console.log(show(a.length) + "," + show(a[3]) + "," + show(JSON.stringify(a)) + "," + show(Object.keys(a).join(",")));
})();

// ===== 吸收 stdlib/round721/p721a-b06.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2];
Object.defineProperty(a, "length", { writable: false });
a.length = 5;
console.log(show(a.length) + "," + show(a.join(",")));
})();
