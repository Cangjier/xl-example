// xl:title Math.max 的长度
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Math.max.length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
