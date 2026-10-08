// xl:title (function () { const f = async () => 1; return f() instanceof Promise; })()
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why `async` 函数的返回值**不是一个承诺**（`(async () => 1)() instanceof Promise` 在 JS 里是真）：本仓的 `async` 只做到「函数值还在、体照跑」，**没有把返回值包成承诺**（`await` 那一套第 691 轮量过、是绿的，缺的是**返回**这一头）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = async () => 1; return f() instanceof Promise; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
