// xl:title Object.keys 可枚举吗
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Object, "keys").enumerable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
