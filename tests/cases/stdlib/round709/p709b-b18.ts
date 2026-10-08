// xl:title Math.random 的名字
// xl:round 709
// xl:judge stdout
// xl:want differ
// xl:why 同 `p709b-b17`：内建函数的 `name` 取不到（`Math.random.name` 在 Node 里是 `"random"`，本仓给 `undefined`）。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Math.random.name)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
