// xl:title JSON.parse 的坏输入：抛出来的那一档要接得住
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：stdlib/json/probe693-j17 / j24 —— 判定点只有一个：
// **坏输入（截断的对象、尾随逗号）抛的是哪一族**（`SyntaxError`，且是可接住的那种）。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => (function () { try { return JSON.parse("{"); } catch (e) { return e.constructor.name; } })());
probe(() => (function () { try { return JSON.parse("[1,]"); } catch (e) { return e.constructor.name; } })());
