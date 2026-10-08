// xl:title defineProperty 之后逐格描述符
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [];
Object.defineProperty(a, 0, { value: 5 });
const d = Object.getOwnPropertyDescriptor(a, 0);
console.log(show(d === undefined) + "," + show(d && d.value) + "," + show(d && d.enumerable));
