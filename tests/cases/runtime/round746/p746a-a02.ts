// xl:title 生成器 `return()` 之后的完成值与 `finally` 链（已经跑起来的那一档）
// xl:round 746
// xl:judge stdout
// xl:end
function* g() { yield 1; yield 2; }
const it = g();
console.log(JSON.stringify(it.next()), JSON.stringify(it.return(7)), JSON.stringify(it.next()));
function* inner() { yield 1; yield 2; }
function* outer() { const got = yield* inner(); yield got; }
const o = outer();
console.log(JSON.stringify(o.next()), JSON.stringify(o.next()), JSON.stringify(o.next()));
function* withFin() { try { yield 1; } finally { console.log("fin"); } }
const w = withFin();
console.log(JSON.stringify(w.next()), JSON.stringify(w.return(3)));
function* talk() { const sent = yield 1; yield sent * 2; }
const t = talk();
console.log(t.next().value, t.next(5).value);
