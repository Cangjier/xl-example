// xl:title Object.keys(globalThis) 的长度
// xl:round 710
// xl:judge stdout
// xl:want differ
// xl:why **宿主那一批全局没有**：`Object.keys(globalThis).length` 在 Node 里是 **15**（`fetch` / `crypto` / `performance` / 定时器 / `navigator` 那一族是**可枚举**的），本仓给 `0`——`stdlib/globals/057-names-globalthis` 登的是同一件事（97 个宿主名）。这些**不在规范里**、属于宿主接口面，要做先得定「本仓要不要做宿主接口」那一档。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(Object.keys(globalThis).length)); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
