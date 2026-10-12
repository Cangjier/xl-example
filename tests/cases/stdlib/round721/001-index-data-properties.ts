// xl:title 下标上的数据属性：值 / 长度 / JSON / 键 / 描述符回读 / defineProperties 两格
// xl:round 797
// xl:judge stdout
// xl:end
// **按判定点并组（第 797 轮）**：把 stdlib/round721 里同判定点的 5 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。

// ===== 吸收 stdlib/round721/p721a-a01.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9 });
console.log(show(a[1]) + "," + show(a.length) + "," + show(a.join(",")) + "," + show(Object.keys(a).join(",")));
})();

// ===== 吸收 stdlib/round721/p721a-a02.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9 });
Object.defineProperty(a, "1", { enumerable: false });
console.log(show(Object.keys(a).join(",")) + "|" + show(a[1]) + "|" + show(JSON.stringify(a)) + "|" + show(a.length));
})();

// ===== 吸收 stdlib/round721/p721a-a03.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9, enumerable: false, writable: false, configurable: false });
const d = Object.getOwnPropertyDescriptor(a, "1");
console.log(show(d.value) + "," + show(d.writable) + "," + show(d.enumerable) + "," + show(d.configurable) + "," + show(a[1]));
})();

// ===== 吸收 stdlib/round721/p721a-a12.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperties(a, { 0: { value: 8, enumerable: true, configurable: true, writable: true }, extra: { value: 1, enumerable: true, configurable: true, writable: true } });
console.log(show(a[0]) + "," + show(a[1]) + "," + show(a.extra) + "," + show(a.length) + "," + show(Object.keys(a).join(",")));
})();

// ===== 吸收 stdlib/round721/p721a-a16.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { value: 9, writable: true, enumerable: true, configurable: true });
a[1] = 42;
console.log(show(a[1]) + "," + show(a.join(",")) + "," + show(Object.keys(a).join(",")));
})();
