// xl:title length 描述符回读：value / writable / enumerable / configurable
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
const d = Object.getOwnPropertyDescriptor(a, "length");
console.log(show(d.value) + "," + show(d.writable) + "," + show(d.enumerable) + "," + show(d.configurable));
