// xl:title Array 的构造与常用方法：from / of / isArray / copyWithin / fill / splice / to* / flat / at / includes / join / reduce / sort
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 14 条探针
// （`p707a-a01` … `p707a-a15`；`a05` 是 blocked 的账，改名成 `006` 单独留着）。每条探针的正文逐字搬进自己的 IIFE，
// `show` / 打印口径与探针一字不差 ⇒ 输出逐行等于原来那些条之和。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// Array.from / Array.of / new Array / isArray
(() => {
  console.log(show(JSON.stringify(Array.from({ length: 3, 0: "a", 2: "c" }))));
})();
(() => {
  console.log(show(JSON.stringify(Array.from([1, 2], (x) => x * 2))));
})();
(() => {
  console.log(show(JSON.stringify(Array.from("ab"))) + "," + show(JSON.stringify(Array.from(new Set([1, 1, 2])))));
})();
(() => {
  console.log(show(JSON.stringify(Array.of(3))) + "," + show(JSON.stringify(new Array(3))));
})();
// 改原件的那一族
(() => {
  const a = [1, 2, 3, 4];
  console.log(show(JSON.stringify(a.copyWithin(1, 2))));
})();
(() => {
  const a = [1, 2, 3, 4];
  console.log(show(JSON.stringify(a.fill(9, -2))) + "," + show(JSON.stringify([1, 2, 3].fill(0, 1, 2))));
})();
(() => {
  const a = [1, 2, 3, 4];
  const removed = a.splice(1, 2, "x");
  console.log(show(JSON.stringify(removed)) + "," + show(JSON.stringify(a)));
})();
// 不改原件的那一族
(() => {
  const a = [3, 1, 2];
  console.log(show(JSON.stringify(a.toReversed())) + "," + show(JSON.stringify(a.toSorted())) + "," + show(JSON.stringify(a.with(0, 9))) + "," + show(JSON.stringify(a)));
})();
(() => {
  console.log(show(JSON.stringify([1, [2, [3]]].flat())) + "," + show(JSON.stringify([1, [2, [3]]].flat(2))) + "," + show(JSON.stringify([1, 2].flatMap((x) => [x, x]))));
})();
// 读取与比较
(() => {
  console.log(show([1, 2, 3].at(-1)) + "," + show([1, 2, 3].at(0)) + "," + show([1, 2, 3].at(3)));
})();
(() => {
  console.log(show([1, 2, 3].includes(2)) + "," + show([NaN].includes(NaN)) + "," + show([NaN].indexOf(NaN)));
})();
(() => {
  console.log(show([1, null, undefined, 2].join()) + "," + show([1, null].join("-")));
})();
(() => {
  console.log(show([1, 2, 3].reduce((a, b) => a + b)) + "," + show([1, 2, 3].reduce((a, b) => a + b, 10)));
})();
(() => {
  console.log(show(JSON.stringify([10, 2, 1].sort())) + "," + show(JSON.stringify([10, 2, 1].sort((a, b) => a - b))));
})();
