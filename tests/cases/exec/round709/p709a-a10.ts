// xl:title typeof 一个函数的 caller
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof (function f() {}).caller)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
