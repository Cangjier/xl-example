// xl:title Map 迭代器条目按下标读
// xl:round 710
// xl:judge stdout
// xl:want differ
// xl:why **`Map` 迭代器交回来的条目不是一个能按下标读的数组**：`Map.prototype[Symbol.iterator]()` 给 `{value, done}` 里的 `value` 该是 `[键, 值]`（Node 给 `e[0] + e[1]` 能算），本仓按下标读抛 `TypeError`。与 `runtime/iterators/probe693b-g15` **同一条根**：迭代器交出来的东西还不是「按位置读的数组」。要做。
// xl:end
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log(show((function () { const m = new Map([["a", 1]]); const it: any = (m as any)[Symbol.iterator](); const e = it.next().value; return e[0] + e[1]; })())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
