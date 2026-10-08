// xl:title Math.E 可配置吗
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "E").configurable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
