// xl:title 私有名在 in 里
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { #x = 1; has(o) { return #x in o; } }
const a = new A();
console.log(show(a.has(a)) + "," + show(a.has({})));
