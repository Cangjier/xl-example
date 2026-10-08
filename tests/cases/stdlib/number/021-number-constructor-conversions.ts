// xl:title Number() 与 Number(string) 的转换表
// xl:round 291
// xl:judge stdout
// xl:end

console.log(Number(), Number(""), Number(" 12 "), Number("0x10"), Number("1e3"));
console.log(Number(null), Number(undefined), Number(true), Number([]), Number([7]), Number([1, 2]));
