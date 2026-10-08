// xl:title 静态块里的 this 与次序
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { static a = 1; static { this.b = this.a + 1; } static c = 3; }
console.log(show(A.a) + "," + show(A.b) + "," + show(A.c));
