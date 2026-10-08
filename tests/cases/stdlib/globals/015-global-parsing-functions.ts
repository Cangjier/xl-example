// xl:title parseInt / parseFloat / isNaN / isFinite 的全家
// xl:round 323
// xl:judge stdout
// xl:end

console.log(parseInt("12px"), parseInt("0x10"), parseInt("10", 2), parseInt(""), parseFloat("3.5x"));
console.log(isNaN("a"), Number.isNaN("a"), isFinite("1"), Number.isFinite("1"));
console.log(Number(""), Number(" "), Number("0b11"), String(1e21));
