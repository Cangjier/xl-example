// xl:title 生成器对象自己的 toString 标签
// xl:round 710
// xl:judge stdout
// xl:want differ
// xl:why **生成器对象的内部标签还没装**（`Object.prototype.toString.call(g())` 在 Node 里是 `[object Generator]`，本仓给 `[object Object]`）。与 `exec/iterators/probe-y14`、`stdlib/console/030` **同一条根**（生成器 / `async` 函数那两档标签）。要做。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { function* g() {} return Object.prototype.toString.call(g()); })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
