// xl:title `parseInt` / `parseFloat` 的前缀与失败形态
// xl:round 330
// xl:judge stdout
// xl:end

console.log(parseInt("  42px"), parseInt("0x1f"), parseInt("08"), parseInt("1e3"));
console.log(parseInt("z", 36), parseInt("-0"), Number.isNaN(parseInt("x")));
console.log(parseFloat("3.14abc"), parseFloat(".5"), parseFloat("1e2"));
