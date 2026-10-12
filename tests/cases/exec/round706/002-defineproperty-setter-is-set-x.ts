// xl:title defineProperty 的 setter 名是 set x
// xl:round 706
// xl:judge stdout
// xl:end
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · exec/round706/p706a-o10.ts
//   · exec/round706/p706b-g05.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, "x", { set(v) {}, configurable: true });
console.log(show(Object.getOwnPropertyDescriptor(o, "x").set.name));
