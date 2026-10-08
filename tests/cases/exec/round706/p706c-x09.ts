// xl:title defineProperty 数组下标之后的属性表
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
console.log(show(Object.getOwnPropertyNames(a).join("|")));
