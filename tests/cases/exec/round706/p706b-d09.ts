// xl:title defineProperty 的键是对象时走 ToPropertyKey
// xl:round 706
// xl:judge stdout
// xl:want blocked
// xl:why ToPropertyKey 的对象那一半：	ext.xl.md 的 TextFrom 直接走 JsTextUnits（引擎的 TextUnitsOf 对对象当场抛「ToString of this kind of value」），而 ToPrimitive(o, string) 要先问对象自己的 toString。同一根也在 getOwnPropertyDescriptor 的数字/对象键那一格上（p706b-d08）。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, { toString() { return "k"; } }, { value: 1, enumerable: true });
console.log(show(o.k));
