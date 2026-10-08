// xl:title 方法取出之后 this 丢失
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { m() { return this === undefined ? "u" : "o"; } }
const a = new A(); const f = a.m;
console.log(show(f()));
