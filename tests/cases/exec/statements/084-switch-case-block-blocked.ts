// xl:title `switch` 的 `case` 后面跟一个裸块（账）
// xl:round 789
// xl:judge stdout
// xl:want blocked
// xl:why probe693b-s14：`switch` 的 `case` 后面跟一个**裸块**（`case 1: { … }`）本仓接不住：块的 `}` 一落下，后面那个 `case` 被当成普通标识符收进上一条 `CaseClause`（降级期报 `unimplemented: statement Identifier`）。JS 里这是遍地都是的写法（`case` 里要 `let` 就得包一层块）。要做。
// xl:end
// **按判定点并组（第 789 轮（三））**：吸收 exec/statements 里逐条一问的 1 条探针
// （probe693b-s14）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// case 1: { … } 里块的 } 一落下，后面那个 case 被当成普通标识符收进上一条 CaseClause——降级期就报 unimplemented

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe693b-s14.ts（第 693 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show((function () { let s = ""; switch (1) { case 1: { s += "x"; break; } case 2: s += "y"; } return s; })()));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
