// xl:title JSON.stringify 的顶格原始值：undefined / 函数 / Symbol 都返回 undefined
// xl:judge stdout
// xl:end

console.log(JSON.stringify(undefined), JSON.stringify(() => 1), JSON.stringify(Symbol("s")));
console.log(JSON.stringify(null), JSON.stringify(true), JSON.stringify("s"), JSON.stringify(0), JSON.stringify(NaN));
console.log(JSON.stringify([undefined, () => 1, Symbol("s")]), JSON.stringify({ a: undefined, b: 1 }));
