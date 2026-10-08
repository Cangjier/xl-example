// xl:title Math 常量的定义属性
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "PI").get === undefined)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
