// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const log = []; function* g() { log.push("start"); try { yield 1; } finally { log.push("fin"); } } const it = g(); log.push(it.n
// xl:round 700
// xl:judge stdout
// xl:note 第 766 轮收掉的那一格（`xl:want differ` / `xl:why` 已按规矩撤掉，用例留着当守卫）：
// xl:note 往生成器里 `throw` 那一档**现在会进帧去走 `try/finally`**——原来 `it.throw(err)`
// xl:note 直接把它标成结束、原样往外抛 ⇒ `finally` 里的清理**一次都不跑**
// xl:note（期望 `start,1,fin,caught`，本仓原来给 `start,1,caught`）。
// xl:note 根子在 `DoThrow` 挑处理点的方式上（详见根 README 第 766 轮与 `vm.xl.md` 那一段）。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const log = [];
function* g() { log.push("start"); try { yield 1; } finally { log.push("fin"); } }
const it = g();
log.push(it.next().value);
try { it.throw(new Error("boom")); } catch (e) { log.push("caught"); }
console.log(log.join(","));
