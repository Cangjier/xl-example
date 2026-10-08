// xl:title 全局 isNaN / isFinite 与 Number.* 不是一回事
// xl:judge stdout
// xl:end

console.log(isNaN("abc"), isNaN("12"), isNaN(NaN), isNaN(undefined));
console.log(isFinite("3"), isFinite("x"), isFinite(1 / 0), Number.isFinite("3" as any));
