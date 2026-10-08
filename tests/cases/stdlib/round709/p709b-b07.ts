// xl:title Math.sqrt 可写吗
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyDescriptor(Math, "sqrt").writable)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
