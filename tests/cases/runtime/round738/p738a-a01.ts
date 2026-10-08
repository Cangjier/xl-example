// xl:title `yield` 后面跟逻辑运算符（`&&` / `||` / `??`）
// xl:round 738
// xl:judge stdout
// xl:end
function* g() { yield 1 && 2; yield 0 || 3; yield null ?? 4; }
console.log([...g()].join(","));
