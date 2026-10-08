// xl:title yield* 委托：内层返回值与外层继续产出
// xl:round 323
// xl:judge stdout
// xl:end

function* inner() { yield 1; yield 2; return "inner-done"; }
function* outer() { const r = yield* inner(); yield r; }
const it = outer();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.next()));
