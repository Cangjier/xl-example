// xl:title `WeakMap` / `WeakSet` 的键与迭代（不可迭代）
// xl:round 737
// xl:judge stdout
// xl:end
const wm = new WeakMap<any, any>();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.delete(k));
console.log(typeof (wm as any)[Symbol.iterator], typeof (wm as any).keys, typeof (wm as any).size);
const ws = new WeakSet<any>();
ws.add(k);
console.log(ws.has(k), typeof (ws as any).forEach);
