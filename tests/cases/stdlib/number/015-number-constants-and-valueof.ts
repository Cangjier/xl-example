// xl:title Number 的常量与字面量的 valueOf / toString
// xl:judge stdout
// xl:end

console.log(Number.EPSILON > 0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
console.log(Number.MAX_VALUE > 1e308, Number.MIN_VALUE > 0, Number.POSITIVE_INFINITY);
console.log((255).valueOf(), (255).toString(), (255).toString(16), (255).toString(2));
