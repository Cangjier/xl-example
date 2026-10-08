// xl:title Function.prototype 上的 for..in
// xl:round 710
// xl:judge stdout
// xl:end
let out = "";
for (const k in Function.prototype) out = out + k + ",";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(out)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
