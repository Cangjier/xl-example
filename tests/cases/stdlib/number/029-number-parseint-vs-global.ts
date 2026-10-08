// xl:title Number.parseInt / parseFloat 与全局的同不同
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Number.parseInt("42px"), parseInt("42px"), Number.parseInt("0x1f"), parseInt("1f", 16));
console.log(Number.parseFloat("3.5e2x"), parseFloat(".5"), Number.parseFloat("x"));
