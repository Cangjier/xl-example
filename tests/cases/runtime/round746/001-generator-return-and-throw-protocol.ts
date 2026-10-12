// xl:title 生成器的 return / throw 协议：没跑过 / 跑了一半 / finally 链 / yield* 委托
// xl:round 746
// xl:judge stdout
// xl:end

function* one() { yield 1; }
const a = one();
console.log(JSON.stringify(a.return(9)), JSON.stringify(a.next()));
function* one2() { yield 1; }
const b = one2();
try { b.throw(new Error("x")); } catch (e) { console.log("caught", (e as Error).message); }
function* pre() { console.log("body"); try { yield 1; } finally { console.log("fin"); } }
const c = pre();
console.log("pre-ret", JSON.stringify(c.return(9)));
function* two() { yield 1; yield 2; }
const d = two();
console.log("n", JSON.stringify(d.next()));
console.log("r", JSON.stringify(d.return(8)));
console.log("r2", JSON.stringify(d.return(8)), JSON.stringify(d.next()));

(() => {
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
})();
