// xl:title 函数自己的名字表在 for..in 里看不见
// xl:round 709
// xl:judge stdout
// xl:end
let out = "";
for (const k in function f() {}) { out = out + k + ","; }
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(out)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
