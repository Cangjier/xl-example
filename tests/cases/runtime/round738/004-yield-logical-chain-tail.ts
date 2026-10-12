// xl:title `yield` 一条逻辑链之后再 `yield`（链尾的落点）
// xl:round 738
// xl:judge stdout
// xl:end
// 第 803 轮改名（原 `p738a-a07`；正文一字未动）。
// 判定点只有一个：**逻辑链的尾巴落在哪一格**——`const a = yield 1 && 2` 交出去的是
// 链的值、`next(实参)` 注回来的是 `a`，下一条 `yield a || 3` 照旧短路。
// （同 `003`：生成器 + 手动 `next()`，不并进合并条。）
function* g() { const a = yield 1 && 2; const b = yield a || 3; yield a + b; }
const it = g();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next(10)), JSON.stringify(it.next(20)), JSON.stringify(it.next()));
