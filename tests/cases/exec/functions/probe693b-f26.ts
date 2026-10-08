// xl:title (function () { const f = function () { }.bind(null); return typeof f; })()
// xl:round 693
// xl:judge stdout
// xl:want blocked
// xl:why `function () { }.bind(null)` 这一格（**函数表达式后面直接跟 `.`**）被投成了 `FunctionDeclaration`——它左边是 `=`、右边是成员访问，**两边都不是声明位**。修法与第 692 轮那几处同族（`IsOperand` / 链那一支要认「下一格是 `.` / `(` / `[` 的函数表达式」）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = function () { }.bind(null); return typeof f; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
