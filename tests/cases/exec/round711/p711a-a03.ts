// xl:title typeof 一条「点号调用 + 取值」的链
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof o.f().v)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
