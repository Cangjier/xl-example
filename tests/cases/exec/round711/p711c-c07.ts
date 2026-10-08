// xl:title Map 的 Symbol.iterator 在不在
// xl:round 711
// xl:judge stdout
// xl:want differ
// xl:why **`Map.prototype[Symbol.iterator]` 那一格没有**：`typeof (new Map())[Symbol.iterator]` 在 Node 里是 `"function"`，本仓给 `undefined`（`Map` 的迭代只在引擎那条 `GetIterator` 路上被认，原型上没有公开的那一格）。与 `stdlib/map-set/103-names-weakmap-proto` 那一族**同一条根**：`Map` / `Set` 的成员面还没铺完。要做。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show(typeof (new Map() as any)[Symbol.iterator])); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
