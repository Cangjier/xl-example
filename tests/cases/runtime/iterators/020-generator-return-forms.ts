// xl:title `return()` 的几种形状：没 finally、finally 里再 yield、已结束之后
// xl:round 336
// xl:judge stdout
// xl:end

function* plain() { yield 1; yield 2; }
const a = plain();
console.log(JSON.stringify(a.next()), JSON.stringify(a.return(7)), JSON.stringify(a.next()));
function* withCatch() {
  try { yield 1; } catch (e) { console.log("caught", e); } finally { console.log("fin"); }
}
const b = withCatch();
console.log(b.next().value, JSON.stringify(b.return(3)));
function* nested() {
  try { try { yield 1; } finally { console.log("inner"); } } finally { console.log("outer"); }
}
const c = nested();
console.log(c.next().value, JSON.stringify(c.return(5)));
function* resumed() { try { yield 1; yield 2; } finally { console.log("clean"); } }
const d = resumed();
console.log(d.next().value, d.next().value, JSON.stringify(d.return(4)));
