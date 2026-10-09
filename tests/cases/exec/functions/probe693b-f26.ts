// xl:title (function () { const f = function () { }.bind(null); return typeof f; })()
// xl:round 693
// xl:judge stdout
// xl:end
// 第 693 轮登记的这条缺口在第 775 轮收掉了（规范：`print-ast-common.xl.md` 的
// `projectExpression` 链那一支——链的头一格是函数 / 类时按**表达式位**投）。
// 用例留着当守卫。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = function () { }.bind(null); return typeof f; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
