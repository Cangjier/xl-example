// xl:title JSON 上的 for..in
// xl:round 710
// xl:judge stdout
// xl:end
let out = "";
for (const k in JSON) out = out + k + ",";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(out)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
