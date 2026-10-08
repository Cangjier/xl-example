// xl:title defineProperty 之后再赋值一次
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [];
Object.defineProperty(a, 0, { value: 5 });
a[1] = 6;
console.log(show(Object.keys(a).join("|")) + " / " + show(a.length));
