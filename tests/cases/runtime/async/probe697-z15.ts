// xl:title (function () { const p = Promise.reject(1); p.catch(() => {}); return Object.getOwnPropertyNames(Object(p)).includes("then"); })()
// xl:round 697
// xl:judge stdout
// xl:want differ
// xl:why `Object.getOwnPropertyNames(promise)` 里**不该有 `then`**（它在 `Promise.prototype` 上，第 690 轮才补上去的那一格）：本仓的承诺实例**自己**还挂着一份 `then` ⇒ 自有属性名单多一格（Node 给假、本仓给真）。要收得把实例上那一份撤掉——那一格是**实例方法**那条老路留下的。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = Promise.reject(1); p.catch(() => {}); return Object.getOwnPropertyNames(Object(p)).includes("then"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
