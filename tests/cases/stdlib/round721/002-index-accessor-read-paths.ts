// xl:title 下标上的访问器：读那一格、`in` / for..in / 属性名表、展开与 Array.from
// xl:round 797
// xl:judge stdout
// xl:end
// **按判定点并组（第 797 轮）**：把 stdlib/round721 里同判定点的 4 条探针并成这一条。
// 正文（含探针自己的 `show` / `run` 壳）逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 原 `p721a-b01` 的账（第 756 / 746 / 721 三轮分别收掉，指令已撤、断言留在这里当守卫）：
// `join` 原来按元素区的格子数循环，而装了访问器之后那一格是洞 ⇒ 循环一次都不进；
// 上界换成 `length` 那一格、该格改走 `GetProperty` 之后三条路都读得到那一格。

// ===== 吸收 stdlib/round721/p721a-a04.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true, configurable: true });
const d = Object.getOwnPropertyDescriptor(a, "1");
console.log(show(typeof d.get) + "," + show(d.set) + "," + show(d.enumerable) + "," + show(typeof d.value));
})();

// ===== 吸收 stdlib/round721/p721a-a15.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true, configurable: true });
let seen = "";
for (const k in a) seen += k;
console.log(show("1" in a) + "," + show(seen) + "," + show(Object.getOwnPropertyNames(a).join(",")));
})();

// ===== 吸收 stdlib/round721/p721a-b01.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true });
console.log(show(a[1]) + "," + show(a.join(",")) + "," + show(JSON.stringify(a)) + "," + show(a.length));
})();

// ===== 吸收 stdlib/round721/p721a-b03.ts =====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "1", { get() { return 99; }, enumerable: true, configurable: true });
console.log(show([...a].join(",")) + "|" + show(Array.from(a).join(",")));
})();
