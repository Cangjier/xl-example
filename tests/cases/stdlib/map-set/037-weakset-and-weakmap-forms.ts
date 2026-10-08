// xl:title WeakSet / WeakMap 的四个格子
// xl:round 291
// xl:judge stdout
// xl:end

const ws = new WeakSet<object>();
const o = {};
ws.add(o);
console.log(ws.has(o), ws.has({}), ws.delete(o), ws.has(o));
const wm = new WeakMap<object, number>();
wm.set(o, 7);
console.log(wm.get(o), wm.has(o));
