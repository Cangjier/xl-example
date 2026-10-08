// xl:title Math 常量的描述符整份
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(JSON.stringify(Object.getOwnPropertyDescriptor(Math, "SQRT2")))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
