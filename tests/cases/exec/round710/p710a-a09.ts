// xl:title 类方法的 call(1) 是严格的
// xl:round 710
// xl:judge stdout
// xl:end
class A { m(this: any) { return typeof this; } }
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(A.prototype.m.call(1))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
