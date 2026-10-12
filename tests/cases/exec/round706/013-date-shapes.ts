// xl:title Date 的形状：无效日期 / UTC 取值 / now 与 toJSON
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮）**：吸收 exec/round706 里逐条一问的 4 条探针
// （p706a-d01 · p706a-d02 · p706a-d03 · p706a-d04）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// Invalid Date 的 toString 与 getTime、UTC 取值与 toISOString、Date.now 的往返、toJSON

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 p706a-d01.ts（第 706 轮）
(() => {
  const d = new Date(0);
  console.log(show(JSON.stringify(d)) + " / " + show(d.toJSON()));
})();

// 吸收 p706a-d02.ts（第 706 轮）
(() => {
  console.log(show(new Date(NaN).toString()) + "," + show(new Date(NaN).getTime()));
})();

// 吸收 p706a-d03.ts（第 706 轮）
(() => {
  const d = new Date("2020-01-02T03:04:05Z");
  console.log(show(d.getUTCFullYear()) + "," + show(d.getUTCMonth()) + "," + show(d.toISOString()));
})();

// 吸收 p706a-d04.ts（第 706 轮）
(() => {
  const t = Date.now();
  console.log(show(typeof t) + "," + show(new Date(t).getTime() === t));
})();
