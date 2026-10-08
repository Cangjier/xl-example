// xl:title defineProperty 之后 identity 与 length 属性
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [];
Object.defineProperty(a, 0, { value: 5 });
console.log(show(Array.isArray(a)) + "," + show(a.length) + "," + show(a[0]) + "," + show(a["0"]));
