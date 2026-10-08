// xl:title 下标调用链当二元左操作数（字符串拼接）（第 743 轮收掉）
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(o[k]().v + "")); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
