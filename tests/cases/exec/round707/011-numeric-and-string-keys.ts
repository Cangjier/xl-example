// xl:title 数字键与字符串键：三种读法、`hasOwn` / 描述符 / `in` / `delete`、展开到数组与对象
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 15 条探针
// （`p707c-o02` · `p707c-o06` · `p707c-o08` … `p707c-o12` · `p707d-k01` … `p707d-k08`）。
// 正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 展开到数组 / 对象字面量
(() => {
  const xs = [1, 2];
  console.log(show(JSON.stringify([...xs])) + "," + show(JSON.stringify({ ...xs })));
})();
// 数字键的三道名表：getOwnPropertyDescriptor / getOwnPropertyDescriptors / hasOwn / propertyIsEnumerable
(() => {
  const o = { 1: "v" };
  console.log(show(Object.getOwnPropertyDescriptor(o, 1) !== undefined) + "," + show(Object.getOwnPropertyDescriptor(o, "1") !== undefined));
})();
(() => {
  console.log(show(Object.getOwnPropertyDescriptor("ab", 1) !== undefined) + "," + show(Object.getOwnPropertyDescriptor("ab", 1) && Object.getOwnPropertyDescriptor("ab", 1).value));
})();
(() => {
  const o = { 1: "v" };
  const d = Object.getOwnPropertyDescriptors(o);
  console.log(show(Object.keys(d).join("|")));
})();
(() => {
  const o = { 1: "v" };
  console.log(show(Object.hasOwn(o, 1)) + "," + show(Object.getOwnPropertyDescriptor(o, 1) !== undefined));
})();
(() => {
  const o = { 1: "v" };
  console.log(show(o.propertyIsEnumerable(1)) + "," + show(o.propertyIsEnumerable("1")));
})();
(() => {
  const o = {}; Object.defineProperty(o, 1, { value: 5, enumerable: true });
  console.log(show(Object.getOwnPropertyDescriptor(o, 1).value));
})();
// 键的各种写法：`1` / `"1"` / 小数 / 负数 / 定义往返 / 自有名次序 / delete / in
(() => {
  const o = { 1: "v" };
  console.log(show(o[1]) + "," + show(o["1"]) + "," + show(Object.hasOwn(o, 1)) + "," + show(Object.hasOwn(o, "1")));
})();
(() => {
  const o = { "1": "v" };
  console.log(show(o[1]) + "," + show(Object.hasOwn(o, 1)));
})();
(() => {
  const o = { 1.5: "v" };
  console.log(show(o[1.5]) + "," + show(Object.hasOwn(o, 1.5)) + "," + show(Object.keys(o).join("|")));
})();
(() => {
  const o = { "-1": "v" };
  console.log(show(o[-1]) + "," + show(Object.hasOwn(o, -1)));
})();
(() => {
  const o = {}; Object.defineProperty(o, 1, { value: 5, enumerable: true });
  console.log(show(Object.getOwnPropertyDescriptor(o, 1).value) + "," + show(Object.getOwnPropertyDescriptor(o, "1").value));
})();
(() => {
  const o = { 2: "b", 1: "a" };
  console.log(show(Object.getOwnPropertyNames(o).join("|")) + "," + show(JSON.stringify(o)));
})();
(() => {
  const o = { 1: "v" }; delete o[1];
  console.log(show(Object.keys(o).length));
})();
(() => {
  const o = { 1: "v" };
  console.log(show(1 in o) + "," + show("1" in o));
})();
