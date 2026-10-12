// xl:title `freeze` 之后 `delete a[1]`：给假、那一格还在
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
console.log(show(delete a[1]) + "," + show(a[1]) + "," + show(a.hasOwnProperty("1")));
