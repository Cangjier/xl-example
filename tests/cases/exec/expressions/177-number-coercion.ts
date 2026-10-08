// xl:title `Number` 转换的边角：对象、数组、十六进制串
// xl:round 691
// xl:judge stdout
// xl:end
console.log(Number([]), Number([5]), Number([1, 2]), Number({}));
console.log(Number("0x10"), Number(""), Number("  "), Number("1e2"));
console.log(Number(true), Number(null), Number(undefined));
