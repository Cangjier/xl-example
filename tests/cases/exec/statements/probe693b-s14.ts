// xl:title (function () { let s = ""; switch (1) { case 1: { s += "x"; break; } case 2: s += "y"; } return s; })()
// xl:round 693
// xl:judge stdout
// xl:want blocked
// xl:why `switch` 的 `case` 后面跟一个**裸块**（`case 1: { … }`）本仓接不住：块的 `}` 一落下，后面那个 `case` 被当成普通标识符收进上一条 `CaseClause`（降级期报 `unimplemented: statement Identifier`）。JS 里这是遍地都是的写法（`case` 里要 `let` 就得包一层块）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; switch (1) { case 1: { s += "x"; break; } case 2: s += "y"; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
