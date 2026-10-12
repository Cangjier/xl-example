// xl:title WeakMap 的 get / set / has / delete
// xl:round 304
// xl:judge stdout
// xl:end

const wm = new WeakMap<object, number>();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.delete(k), wm.has(k), wm.get(k));
