// xl:title 下标调用链当相等比较的左操作数
// xl:round 711
// xl:judge stdout
// xl:want differ
// xl:why 同 `p711b-b01`（`o[k]().v === 1` 拿到的是那个函数自己）。要做。
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(o[k]().v === 1)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
