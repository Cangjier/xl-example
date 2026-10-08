// xl:title async 函数的自有名字表
// xl:round 709
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.getOwnPropertyNames(async function a(b: any) {}).join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
