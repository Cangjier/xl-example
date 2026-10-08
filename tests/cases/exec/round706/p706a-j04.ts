// xl:title parse 的 reviver 与 __proto__
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const o = JSON.parse('{"__proto__": {"x": 1}}');
console.log(show(Object.getPrototypeOf(o) === Object.prototype) + "," + show(Object.prototype.hasOwnProperty.call(o, "__proto__")));
