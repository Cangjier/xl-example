// xl:title `parseInt` 的各种前缀与基数
// xl:round 691
// xl:judge stdout
// xl:end
console.log(parseInt("0x10"), parseInt("10", 2), parseInt("  12px"), parseInt("-0"));
console.log(parseInt("08"), parseInt("zz", 36), parseInt(""));
console.log(parseInt("1e2"), parseFloat("1e2"), Number(""));
