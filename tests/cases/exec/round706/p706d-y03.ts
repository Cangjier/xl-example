// xl:title defineProperty 之后 keys / names / length 描述符
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = []; Object.defineProperty(a, 0, { value: 5, configurable: true });
console.log(show(Object.keys(a).join("|")) + " / " + show(Object.getOwnPropertyNames(a).join("|")));
const d = Object.getOwnPropertyDescriptor(a, "length");
console.log(show(d.enumerable) + "," + show(d.writable) + "," + show(d.value));
