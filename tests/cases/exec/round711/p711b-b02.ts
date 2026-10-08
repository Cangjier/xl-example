// xl:title 下标调用链当二元右操作数
// xl:round 711
// xl:judge stdout
// xl:want differ
// xl:why 同 `p711b-b01`（`1 + o[k]().v`）：链被截断之后那次调用落在别的东西上，运行期报 `cannot call a non-closure value`。要做。
// xl:end
const o: any = { f: () => ({ v: 1 }) };
const k = "f";
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(1 + o[k]().v)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
