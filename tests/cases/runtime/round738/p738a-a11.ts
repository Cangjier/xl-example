// xl:title `yield*` 后面跟逻辑链（委托与括号两种排版）
// xl:round 738
// xl:judge stdout
// xl:end
function* inner() { yield 1; yield 2; }
function* outer() { yield* inner(); yield* (inner() as any); }
console.log([...outer()].join(","));
function* nums() { yield 3; }
function* pick() { const v = yield* nums() as any; yield v; }
console.log(JSON.stringify([...pick()].join(",")));
