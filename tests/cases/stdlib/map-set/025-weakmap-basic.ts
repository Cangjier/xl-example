// xl:title WeakMap：set / get / has / delete
// xl:judge stdout
// xl:end

const wm = new WeakMap<object, number>();
const k = {};
wm.set(k, 1);
console.log(wm.get(k), wm.has(k), wm.delete(k), wm.has(k));
