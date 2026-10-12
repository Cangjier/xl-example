// xl:title `WeakMap` 的条目不进 `JSON.stringify` / `Object.keys`
// xl:round 305
// xl:judge stdout
// xl:end

const wm = new WeakMap<object, number>();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), JSON.stringify(wm), Object.keys(wm).length);
