// xl:title parseInt 的 radix：0x 前缀、前导空白、非法基数与截断
// xl:judge stdout
// xl:end

console.log(parseInt("  42abc", 10), parseInt("0x1f"), parseInt("1f", 16), parseInt("11", 2));
console.log(parseInt("-0"), 1 / parseInt("-0"), parseInt("08"), parseInt("z", 36));
console.log(parseInt("10", 1), parseInt("10", 37), parseInt(""), Number.isNaN(parseInt("x")));
