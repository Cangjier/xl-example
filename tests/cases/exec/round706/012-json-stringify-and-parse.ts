// xl:title JSON.stringify 与 JSON.parse 的值形状与边界
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 6 条探针
// （p706a-j01 · p706a-j02 · p706a-j03 · p706a-j04 · p706a-j05 · p706a-j06）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// 键序、replacer 数组、环抛 TypeError、__proto__ 键、往返与 toJSON

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-j01.ts（第 706 轮）
(() => {
  console.log(show(JSON.stringify({ b: 1, a: 2 })));
})();

// 吸收 p706a-j02.ts（第 706 轮）
(() => {
  console.log(show(JSON.stringify({ a: 1, b: 2 }, ["a"])));
})();

// 吸收 p706a-j03.ts（第 706 轮）
(() => {
  const o = {}; o.self = o;
  run(() => { console.log(show(JSON.stringify(o))); });
})();

// 吸收 p706a-j04.ts（第 706 轮）
(() => {
  const o = JSON.parse('{"__proto__": {"x": 1}}');
  console.log(show(Object.getPrototypeOf(o) === Object.prototype) + "," + show(Object.prototype.hasOwnProperty.call(o, "__proto__")));
})();

// 吸收 p706a-j05.ts（第 706 轮）
(() => {
  console.log(show(JSON.stringify(JSON.parse("  [1, 2.5, -0]  "))) + "," + show(JSON.stringify(JSON.parse('"a"'))) + "," + show(String(JSON.parse("1e2"))));
})();

// 吸收 p706a-j06.ts（第 706 轮）
(() => {
  console.log(show(JSON.stringify({ a: { toJSON() { return 9; } } })));
})();
