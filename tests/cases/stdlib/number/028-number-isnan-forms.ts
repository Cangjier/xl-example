// xl:title Number.isNaN / isFinite 与全局那两个的分工
// xl:round 304
// xl:judge stdout
// xl:end

console.log(Number.isNaN(NaN), Number.isNaN("NaN"), isNaN("NaN"), isNaN(NaN));
console.log(Number.isFinite("1"), isFinite("1"), Number.isFinite(Infinity), isFinite(Infinity));
