// xl:title 点号调用链当二元左操作数
// xl:round 711
// xl:judge stdout
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(o.f().v + "")); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
