// xl:title Object.keys(Promise) 的长度
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(Promise).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
