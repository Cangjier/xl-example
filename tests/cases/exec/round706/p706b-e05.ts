// xl:title delete 数组下标
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const a = [1, 2, 3]; delete a[1];
console.log(show(a.length) + "," + show(1 in a) + "," + show(JSON.stringify(a)));
