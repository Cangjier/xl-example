// xl:title 类字段在同一格上的次序
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { x = 1; m() { return this.x; } }
console.log(show(new A().m()) + "," + show(Object.keys(new A()).join("|")));
