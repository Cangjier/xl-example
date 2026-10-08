// xl:title Map 的 forEach 次序
// xl:round 710
// xl:judge stdout
// xl:end
let out = "";
new Map([["a", 1], ["b", 2]]).forEach((v, k) => { out = out + k + v; });
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(out)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
