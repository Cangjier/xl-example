// xl:title 正则字面量还没进语法层（账）
// xl:round 789
// xl:judge stdout
// xl:want blocked
// xl:why probe696-s02：正则字面量那一档还没实现（`unimplemented: expression RegularExpressionLiteral`）——`replace` 的**回调**那一半另有判据（`probe696-s02` 的兄弟 s04 走的是文本切分），缺的是**裁判这一侧的语法**。；probe696-s05：同上：`split(/,/)` 里的正则字面量还没进语法层。；probe703-s-e33：正则字面量还没实现（`unimplemented: expression RegularExpressionLiteral`）——`RegExp` 整族待做，见 `stdlib/string/136` 与 `probe693-y30` 那一族。；probe704-s-e12：正则字面量还没实现（`unimplemented: expression RegularExpressionLiteral`）——`RegExp` 整族待做，与第 703 轮登记的 `p703s-e33` **同一条根**。要做。
// xl:end
// **按判定点并组（第 789 轮）**：吸收 stdlib/string 里逐条一问的 4 条探针
// （probe696-s2 · probe696-s5 · probe703-s-e33 · probe704-s-e12）。正文逐字搬进各自的 IIFE，输出逐行等于原来那些条之和。
// replace(/b/, …) / split(/,/) / replace(/\d/g, …) 都报 unimplemented: expression RegularExpressionLiteral——与 RegExp 整族待做同一条根

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// 吸收 probe696-s02.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".replace(/b/, (m) => m + m)));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe696-s05.ts（第 696 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a,b".split(/,/).join("|")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe703-s-e33.ts（第 703 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("abc".replace(/b/, "X")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();

// 吸收 probe704-s-e12.ts（第 704 轮）
(() => {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  try {
    console.log(show("a1b2".replace(/\d/g, "#")));
  } catch (e) {
    console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
  }
})();
