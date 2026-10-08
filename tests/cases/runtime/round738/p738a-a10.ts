// xl:title `yield*` 与逻辑运算符 / `await` 混排
// xl:round 738
// xl:judge stdout
// xl:end
function* inner() { yield 1; yield 2; }
function* outer() { yield* inner(); yield (3 && 4); }
console.log([...outer()].join(","));
async function f() { return await (Promise.resolve(1) ?? 2) && "ok"; }
f().then((v) => console.log(v));
