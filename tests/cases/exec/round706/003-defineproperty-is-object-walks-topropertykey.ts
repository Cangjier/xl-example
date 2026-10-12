// xl:title defineProperty 的键是对象时走 ToPropertyKey
// xl:round 706
// xl:judge stdout
// xl:want blocked
// xl:why ToPropertyKey 的对象那一半：	ext.xl.md 的 TextFrom 直接走 JsTextUnits（引擎的 TextUnitsOf 对对象当场抛「ToString of this kind of value」），而 ToPrimitive(o, string) 要先问对象自己的 toString。同一根也在 getOwnPropertyDescriptor 的数字/对象键那一格上（p706b-d08）。
// xl:end
// **合并了原先逐字节相同的 2 条**（同一件事被逐批重抄的结果）：
//   · exec/round706/p706b-d09.ts
//   · exec/round706/p706c-x12.ts
// 判定点只有一个：正文那一句表达式（期望值由真 `node` 现给，打印口径钉成 `typeof:值`）。
// 被吸收的那几条的正文与本条**逐字节相同**，所以合并不改变任何判据。

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, { toString() { return "k"; } }, { value: 1, enumerable: true });
console.log(show(o.k));
