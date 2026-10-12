// xl:title WeakMap / WeakSet：对象键、不可枚举、has/delete
// xl:round 323
// xl:judge stdout
// xl:end

const wm = new WeakMap();
const k1 = {};
wm.set(k1, 1);
console.log(wm.get(k1), wm.has(k1), wm.delete(k1), wm.has(k1));
const ws = new WeakSet([k1]);
console.log(ws.has(k1), Object.keys(ws).length);
