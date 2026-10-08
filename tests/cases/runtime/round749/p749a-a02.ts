// xl:title 生成器：`return()` / `throw()` 与 `for..of` 的提前退出清扫
// xl:round 749
// xl:judge stdout
// xl:end
function* g() { try { yield 1; yield 2; } finally { console.log("cleanup"); } }
const it = g();
console.log(it.next().value, JSON.stringify(it.return(9)));
console.log("---");
function* h() { try { yield 1; } catch (e) { console.log("caught", e); yield 2; } finally { console.log("h fin"); } }
const ih = h();
console.log(ih.next().value);
console.log(JSON.stringify(ih.throw("boom")));
console.log("---");
for (const v of (function* () { try { yield 1; yield 2; } finally { console.log("loop fin"); } })()) {
  console.log("v", v);
  break;
}
