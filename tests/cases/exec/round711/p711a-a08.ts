// xl:title void 一条下标调用链
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(void o[k]().v)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
