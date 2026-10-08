// xl:title defineProperty 一个越界下标
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [];
Object.defineProperty(a, 3, { value: 5 });
console.log(show(a.length) + "," + show(Object.keys(a).join("|")) + "," + show(JSON.stringify(a)));
