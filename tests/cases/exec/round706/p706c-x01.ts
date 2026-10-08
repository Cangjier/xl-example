// xl:title 数组普通赋值与 length
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = []; a[0] = 5;
console.log(show(a.length) + "," + show(JSON.stringify(a)));
