// xl:title `yield*` 转发（惰性转发，不是一次收完）
// xl:judge stdout
// xl:end

function* inner(): any { yield 1; yield 2; }
function* outer(): any { yield 0; yield* inner(); yield* [3]; }
console.log([...outer()].join(","));
