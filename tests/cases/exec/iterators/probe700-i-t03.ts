// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const log = []; function* g() { log.push("start"); try { yield 1; } finally { log.push("fin"); } } const it = g(); log.push(it.n
// xl:round 700
// xl:judge stdout
// xl:want differ
// xl:why 往生成器里 `throw` 那一档**没有进入帧去走 `try/finally`**：`it.throw(err)` 应该把错误送进生成器**挂起的那一点**（于是 `finally` 先跑、再由它抛出），本仓直接把它标成结束、原样往外抛 ⇒ `finally` 里的清理**一次都不跑**（探针期望 `start,1,fin,caught`，本仓给 `start,1,caught`）。`next` 那一档（`return` / `throw` 三条路）第 313 轮就分开了，缺的是「抛出时先解栈到处理点」这一步。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const log = [];
function* g() { log.push("start"); try { yield 1; } finally { log.push("fin"); } }
const it = g();
log.push(it.next().value);
try { it.throw(new Error("boom")); } catch (e) { log.push("caught"); }
console.log(log.join(","));
