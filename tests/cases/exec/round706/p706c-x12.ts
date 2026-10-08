// xl:title defineProperty 对象键走 toString
// xl:round 706
// xl:judge stdout
// xl:want blocked
// xl:why 与 p706b-d09 同根：defineProperty 的键是对象时要先 ToPrimitive（调它自己的 toString）再取文本，而 TextFrom 这一趟对对象直接抛。
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = {}; Object.defineProperty(o, { toString() { return "k"; } }, { value: 1, enumerable: true });
console.log(show(o.k));
