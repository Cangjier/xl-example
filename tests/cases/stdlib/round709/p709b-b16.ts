// xl:title Math 上的键有几个可枚举
// xl:round 709
// xl:judge stdout
// xl:end
let n = 0;
for (const k in Math) n = n + 1;
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(n)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
