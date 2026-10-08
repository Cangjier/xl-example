// xl:title `yield` 一条逻辑链之后再 `yield`（链尾的落点）
// xl:round 738
// xl:judge stdout
// xl:end
function* g() { const a = yield 1 && 2; const b = yield a || 3; yield a + b; }
const it = g();
console.log(JSON.stringify(it.next()), JSON.stringify(it.next(10)), JSON.stringify(it.next(20)), JSON.stringify(it.next()));
