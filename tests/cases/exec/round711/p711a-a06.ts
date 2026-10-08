// xl:title 链取值之后再接一次调用
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ g: () => 7 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(o[k]().g())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
