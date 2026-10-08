// xl:title 越界下标：length 跟着长（define 与赋值两条路）
// xl:round 721
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };
const a = [1, 2, 3];
Object.defineProperty(a, "5", { value: 6 });
console.log(show(a.length) + "," + show(a[5]) + "," + show(a.join(",")) + "," + show(JSON.stringify(a)));
const b = [1];
b[4] = 5;
console.log(show(b.length) + "," + show(Object.keys(b).join(",")));
