// xl:title 全局 parseInt 的基数与前缀
// xl:round 304
// xl:judge stdout
// xl:end

console.log(parseInt("0x10"), parseInt("0x10", 16), parseInt("10", 2), parseInt("0b10"));
console.log(parseInt("  42  "), parseInt("-7.9"), parseInt("zz"), parseInt(""), Number.isNaN(parseInt("x")));
