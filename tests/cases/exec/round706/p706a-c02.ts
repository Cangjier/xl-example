// xl:title 取值器与同名的数据格
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { get x() { return 1; } set x(v) { this.y = v; } }
const a = new A(); a.x = 5;
console.log(show(a.x) + "," + show(a.y) + "," + show(Object.keys(a).join("|")));
