// xl:title (function () { class A extends Array { } const a = new A(); a.push(1); return a.length; })()
// xl:round 693
// xl:judge stdout
// xl:want blocked
// xl:why `class A extends Array` 本仓在降级期报 `heap object is not an environment`（**整份文件进不来**）：内建构造当父类时那一格不是「环境」。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A extends Array { } const a = new A(); a.push(1); return a.length; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
