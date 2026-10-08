// xl:title Math.PI 可写吗
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "PI").writable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
