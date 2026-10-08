// xl:title typeof 嵌套调用的链
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ g: () => ({ v: 3 }) }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof o[k]().g().v)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
