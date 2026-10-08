// xl:title Math.PI 的描述符四格
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(JSON.stringify(Object.getOwnPropertyDescriptor(Math, "PI")))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
