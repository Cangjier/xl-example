// xl:title `WeakMap` / `WeakSet` 的键限制与 API
// xl:round 691
// xl:judge stdout
// xl:end
const wm: any = new WeakMap<any, any>();
const k: any = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.delete(k), wm.has(k));
try { wm.set(1, 2); } catch (e: any) { console.log("badkey", e.constructor.name); }
const ws: any = new WeakSet<any>();
ws.add(k);
console.log(ws.has(k), typeof wm.get(k));
