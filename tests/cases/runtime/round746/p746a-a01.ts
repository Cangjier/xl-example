// xl:title 生成器的 `return(v)` / `throw(v)` 打在**还没跑过**的生成器上
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
