// xl:title Number.parseInt / parseFloat 与全局那两个的差别（含「同一个函数」）
// xl:judge stdout
// xl:end

console.log(Number.parseInt("42px"), Number.parseInt("ff", 16), Number.parseFloat("3.5x"));
console.log(parseInt("42px"), parseFloat("3.5x"), parseInt(""), parseInt("0x10"));
console.log(Number.parseInt === parseInt, Number.parseFloat === parseFloat);
