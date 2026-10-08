// xl:title Number.isInteger / isSafeInteger / isFinite / isNaN 与全局那两个的分工
// xl:judge stdout
// xl:end

console.log(Number.isInteger(1), Number.isInteger(1.5), Number.isInteger("1"));
console.log(Number.isSafeInteger(2 ** 53 - 1), Number.isSafeInteger(2 ** 53));
console.log(Number.isFinite("1"), isFinite("1" as any), Number.isNaN("x"), isNaN("x" as any));
