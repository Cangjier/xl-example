// xl:title 类访问器的 name
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { get x() { return 1; } }
console.log(show(Object.getOwnPropertyDescriptor(A.prototype, "x").get.name));
