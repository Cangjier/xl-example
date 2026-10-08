// xl:title Math 的取舍：非数值实参怎么处理
// xl:judge stdout
// xl:end

console.log(Math.floor("2.5" as any), Math.abs("-3" as any));
console.log(Math.max(1, "9" as any), Math.min(1, NaN));
