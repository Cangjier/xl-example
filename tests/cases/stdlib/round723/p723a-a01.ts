// xl:title `freeze` 之后写已有下标：静默、值不动
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.freeze(a);
a[1] = 9;
console.log(show(a[1]) + "," + show(a.join(",")) + "," + show(JSON.stringify(a)));
