// xl:title JSON.stringify 的访问器：不可枚举的不印、抛的原样抛
// xl:round 785
// xl:judge stdout
// xl:end
// **合并**（第 785 轮）：stdlib/json/probe695-j14 / j15 / j16 / j36 —— 判定点只有一个：
// **`defineProperty` 造出来的访问器**（`enumerable` 那位决定印不印，`space` 一起过）与
// **getter 自己抛**（异常要原样穿出去，不被吞成 `{}`）。逐条原样搬进来。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f) => {
  try {
    console.log(show(f()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
};
probe(() => (function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, enumerable: true }); return JSON.stringify(o); })());
probe(() => (function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; } }); return JSON.stringify(o); })());
probe(() => (function () { const o = {}; Object.defineProperty(o, "a", { get() { return 1; }, enumerable: true }); return JSON.stringify(o, null, 2); })());
probe(() => (function () { const o = { get a() { throw new Error("boom"); } }; try { return JSON.stringify(o); } catch (e) { return "threw:" + e.message; } })());
