// xl:title async 函数的原型是 undefined
// xl:round 710
// xl:judge stdout
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof (async function () {}).prototype)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
