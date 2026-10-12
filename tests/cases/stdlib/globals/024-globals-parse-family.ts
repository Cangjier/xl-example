// xl:title parseInt / parseFloat / isNaN / isFinite 的松散口径
// xl:round 371
// xl:judge stdout
// xl:end
console.log(isNaN(NaN), isNaN("abc" as any), isNaN("" as any), isNaN(undefined as any), isNaN(null as any));
console.log(isFinite("1" as any), isFinite("" as any), isFinite(null as any), isFinite(Infinity));
console.log(parseInt("0b101" as any), parseInt("10", 16), parseFloat(" 3.5 "), parseFloat("-.5"));
