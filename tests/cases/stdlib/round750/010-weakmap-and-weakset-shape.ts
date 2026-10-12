// xl:title `WeakMap` / `WeakSet` 的形状与键约束
// xl:round 750
// xl:judge stdout
// xl:end
const wm = new WeakMap();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.has({}), wm.delete(k), wm.has(k));
try { wm.set(1 as any, 2); } catch (e) { console.log("weak key", (e as Error).constructor.name); }
const ws = new WeakSet();
ws.add(k);
console.log(ws.has(k), ws.has({}), ws.delete(k), ws.has(k));
console.log(Object.getOwnPropertyNames(WeakMap.prototype).sort().join(","));
console.log(Object.getOwnPropertyNames(WeakSet.prototype).sort().join(","));
