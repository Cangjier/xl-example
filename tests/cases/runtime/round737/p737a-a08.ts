// xl:title `yield*` 委托：值、返回值与 `throw` 的传递
// xl:round 737
// xl:judge stdout
// xl:end
function* inner() { yield 1; yield 2; return "R"; }
function* outer() { const r = yield* inner(); yield "got:" + r; }
console.log([...outer()].join(","));
function* pass() { try { yield 1; } catch (e: any) { yield "caught:" + e.message; } }
const it = pass();
console.log(JSON.stringify(it.next()));
console.log(JSON.stringify(it.throw(new Error("x"))));
