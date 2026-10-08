// xl:title 下标调用链当数组字面量的元素
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show([o[k]().v].join(","))); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
