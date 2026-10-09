// xl:title `class A extends Array`：内建构造当基类时，构造帧里那条路还没接上
// xl:round 788
// xl:judge stdout
// xl:want blocked
// xl:why `class A extends Array` 本仓在降级期报 `heap object is not an environment`（**整份文件进不来**）：内建构造当父类时那一格不是「环境」——`super(...)` 落到**宿主构造**上时同一条路（与 `class M extends Error {}` 那一格同根）。要做。
// xl:end
// 这一条并了原先同根的 2 条：`probe693b-k27`（`push` 之后读 `length`）与
// `probe699-k-e41`（`new A(3).length`）——同一个判定点的两种排版，都是 blocked。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A extends Array { } const a = new A(); a.push(1); return a.length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
try {
  console.log(show((() => { class A extends Array { } return (new A(3).length); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}

// **同一条根并账（第 791 轮）**：同一处根（函数体 + 内建基类 ⇒ `heap object is not an environment`）
// 吸收 stdlib/error/probe697-e16.ts（同一条根）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { class M extends Error {} const m = new M("x"); return [m.name, m.message, m instanceof Error].join(","); })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
