// xl:title `length` 不可写之后 `defineProperty` 的收与抛：改回可写 / 同值 / 可枚举可配置 / 访问器
// xl:round 722
// xl:judge stdout
// xl:end
// **按判定点并组（第 801 轮）**：把 stdlib/round722 里同判定点的 4 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round722/p722a-a06.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { writable: false });
run(() => { Object.defineProperty(a, "length", { writable: true }); console.log("ok:" + a.length); });
console.log(show(Object.getOwnPropertyDescriptor(a, "length").writable));
})();

// ===== 吸收 stdlib/round722/p722a-a07.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "length", { writable: false });
run(() => { Object.defineProperty(a, "length", { value: 3 }); console.log("same:" + a.length); });
run(() => { Object.defineProperty(a, "length", { value: 1 }); console.log("short:" + a.length); });
console.log(show(a.length) + "," + show(a.join(",")));
})();

// ===== 吸收 stdlib/round722/p722a-a08.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { enumerable: true }); console.log("enum-ok"); });
run(() => { Object.defineProperty(a, "length", { configurable: true }); console.log("conf-ok"); });
console.log(show(a.length));
})();

// ===== 吸收 stdlib/round722/p722a-a09.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
run(() => { Object.defineProperty(a, "length", { get() { return 9; } }); console.log("get-ok:" + a.length); });
run(() => { Object.defineProperty(a, "length", { set(v) { } }); console.log("set-ok"); });
console.log(show(a.length) + "," + show(a.join(",")));
})();
