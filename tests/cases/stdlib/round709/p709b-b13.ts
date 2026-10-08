// xl:title Number.isInteger 可枚举吗
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Number, "isInteger").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
