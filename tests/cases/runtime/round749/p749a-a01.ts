// xl:title 生成器：`yield*` 委托与 `return` / `throw` 的透传
// xl:round 749
// xl:judge stdout
// xl:end
function* inner() { try { yield 1; yield 2; } finally { console.log("inner fin"); } }
function* outer() { const got = yield* inner(); console.log("got", got); yield 3; }
const it = outer();
console.log(it.next().value, it.next().value, it.next().value, JSON.stringify(it.next()));
console.log("---");
function* g2() { yield* [10, 20]; yield* "ab"; }
console.log([...g2()].join(","));
function* g3() { yield 1; }
const i3 = g3();
console.log(i3.next().value, JSON.stringify(i3.next()), JSON.stringify(i3.next()));
