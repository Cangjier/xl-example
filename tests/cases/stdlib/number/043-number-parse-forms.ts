// xl:title Number() / parseInt / parseFloat 的分工
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Number(""), Number(" 12 "), Number("0x10"), Number("1e3"), Number("12px"), Number(null as any), Number(true));
console.log(parseInt("12px"), parseInt("0x1f"), parseInt("08"), parseInt("101", 2), parseInt("z", 36), parseInt(""));
console.log(parseFloat("3.5x"), parseFloat(".5"), parseFloat("1e2"), parseFloat("Infinity"));
