// xl:title `yield*`：转发另一个可迭代物（数组与生成器）
// xl:judge stdout
// xl:end

function* inner(): any { yield 2; yield 3; }
function* outer(): any { yield 1; yield* inner(); yield* [4, 5]; yield 6; }
console.log([...outer()].join(","));
