// xl:title Object.keys 一个函数给出空
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(function f() {}).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
