// xl:title typeof (function () {}).prototype
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先逐字节相同的 5 条**（同一件事被逐批重抄的结果）：
//   · exec/expressions/probe2-b20.ts
//   · exec/functions/probe-f06.ts
//   · exec/functions/probe700-f-e37.ts
//   · exec/functions/probe703-f-g21.ts
//   · exec/functions/probe705-t-a28.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof (function () {}).prototype));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
