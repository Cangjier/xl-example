// xl:title `String.prototype.at`：负数 / 越界 / 与 `charAt` 的分工
// xl:round 371
// xl:judge stdout
// xl:end
// **第 812 轮并组**：这一条是 `086-string-at-forms`，把同判定点的一条吸进来、来源下盘：
//   205-abc-at-1（`"abc".at(-1)`——它原来是探针命名改造后留下的 `abc-at-1` 外形）
// 判定点只有一个：**下标读那一格的两套口径**——`at` 认负下标（从尾部数）、越界给 `undefined`；
//  `charAt` 不认负下标（给空串）、越界也给空串；小数下标各自怎么落位。
const s = "hello";
console.log(s.at(0), s.at(-1), s.at(-5), s.at(5), s.at(-6));
console.log(s.charAt(0), s.charAt(-1), s.charAt(5), JSON.stringify(s.charAt(5)));
console.log(s.at(1.5), s.charAt(1.9));

// ===== 第 812 轮并入：1 条同判定点来源（正文逐字照搬） =====

// ---- 并自 205-abc-at-1.ts ----
(() => {
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · stdlib/string/probe699-s-e01.ts
//   · stdlib/string/probe703-s-e01.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show("abc".at(-1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();
