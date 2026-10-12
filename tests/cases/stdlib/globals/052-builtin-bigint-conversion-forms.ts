// xl:title BigInt：BigInt() 转换、1n 字面量、与 Number 互转
// xl:judge stdout
// xl:want blocked
// xl:why `BigInt` 全局名没登记。**必做**
// xl:end

console.log(BigInt("123") + 1n, typeof BigInt(1), 5n * 2n);
console.log(BigInt(Number.MAX_SAFE_INTEGER) + 2n);
console.log(Number(10n), BigInt(10) === 10n, 1n < 2);
