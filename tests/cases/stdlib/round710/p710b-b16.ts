// xl:title Function.prototype.call 可枚举吗
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Function.prototype, "call").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
