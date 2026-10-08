// xl:title typeof 变量的链与直接取值一致
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((typeof o[k]().v) === (typeof o[k]().v))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
