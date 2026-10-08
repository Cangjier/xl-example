// xl:title Number.isInteger / isFinite / isNaN（不做转换）
// xl:judge stdout
// xl:end

console.log(Number.isInteger(1), Number.isInteger(1.5), Number.isInteger("1" as any));
console.log(Number.isFinite(1), Number.isFinite(1 / 0), Number.isFinite("1" as any));
console.log(Number.isNaN(NaN), Number.isNaN("abc" as any));
