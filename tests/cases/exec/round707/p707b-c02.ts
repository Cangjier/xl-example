// xl:title super 在构造函数里
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { constructor(x) { this.x = x; } }
class B extends A { constructor() { super(1); this.y = 2; } }
console.log(show(JSON.stringify(new B())));
