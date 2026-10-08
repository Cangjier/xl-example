// xl:title 全局 isNaN / isFinite 的隐式转换
// xl:round 304
// xl:judge stdout
// xl:end

console.log(isNaN(undefined), isNaN(null), isNaN(""), isNaN(" "), isNaN("1a"), isNaN([]), isNaN([1]));
console.log(isFinite(""), isFinite(null), isFinite([]), isFinite([1]));
