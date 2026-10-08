// xl:title 派生类构造函数里 super 之后 this
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { constructor() { this.a = 1; } }
class B extends A { constructor() { super(); console.log(show(this.a)); } }
new B();
