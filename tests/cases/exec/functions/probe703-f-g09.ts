// xl:title new Function("a", "return a")(1)
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `new Function(...)` 没实现：本仓抛 `Error`，JS 给一个真函数（`new Function("a", "return a")(1)` 是 `1`）。要做就要一条「从源码串造闭包」的路——走的是**另一份源码的解析 + 降级**，与 `eval` 同一族（都没有）。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(new Function("a", "return a")(1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
