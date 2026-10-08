// xl:title 下标调用链当相等比较的左操作数（第 743 轮收掉）
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(o[k]().v === 1)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
