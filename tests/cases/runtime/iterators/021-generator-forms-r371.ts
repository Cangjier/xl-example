// xl:title 生成器：传值、委托、return、throw、提前结束
// xl:round 371
// xl:judge stdout
// xl:end
function* twoWay() {
  const a = yield 1;
  const b = yield a + 1;
  return a + b;
}
const g = twoWay();
console.log(JSON.stringify(g.next()), JSON.stringify(g.next(10)), JSON.stringify(g.next(20)));
function* inner() { yield "i1"; yield "i2"; }
function* outer() { yield "o1"; yield* inner(); yield "o2"; }
console.log([...outer()].join(","));
function* withReturn() { try { yield 1; yield 2; } finally { console.log("gen-finally"); } }
const h = withReturn();
console.log(JSON.stringify(h.next()), JSON.stringify(h.return(9)));
function* catcher() { try { yield 1; } catch (e) { console.log("caught", (e as Error).message); } }
const k = catcher();
k.next();
k.throw(new Error("into"));
console.log([...k].length);
