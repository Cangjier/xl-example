// xl:title new Set([1]).add(2).size
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · stdlib/map-set/probe-g15.ts
//   · stdlib/map-set/probe703-m-d06.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(new Set([1]).add(2).size));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
