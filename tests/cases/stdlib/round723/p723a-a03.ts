// xl:title `seal` 之后写已有下标：写得进去；`delete` 给假
// xl:round 723
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.seal(a);
a[1] = 9;
console.log(show(delete a[1]) + "," + show(a[1]) + "," + show(a.length));
