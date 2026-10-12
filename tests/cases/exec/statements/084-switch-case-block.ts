// xl:title `switch` 的 `case` 后面跟一个裸块
// xl:round 789
// xl:judge stdout
// xl:end
// **按判定点并组（第 789 轮（三））**：吸收 exec/statements 里逐条一问的 1 条探针
// （probe693b-s14）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
//
// **这一格第 841 轮就修好了，可台账一直到第 886 轮才撤**（第 841 轮「switch 分段的两个差一格」
// 收掉了它）：`xl:want blocked` 那一行留在文件头里，于是 `coverage` 连着 44 轮把它列进
// 「台账该更新了（原来记 blocked、现在过了）」——而 `coverage` 是**尺子不是门**，只提醒、不拦。
// 这一轮按规矩撤账：删 `xl:want` / `xl:why`、文件名去掉 `-blocked` 尾巴，用例留着当守卫
// （`case 1: { … }` 后面再跟一个 `case` 的那一格就在这正文里）。

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
