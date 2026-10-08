// xl:title 全局函数的显式调用与 globalThis
// xl:round 291
// xl:judge stdout
// xl:end

console.log(parseInt("3"), parseFloat("3.5"), isNaN("x"), isFinite("3"));
console.log(Boolean(0), Boolean(""), Boolean([]), String(0), Number(""));
console.log(typeof globalThis, globalThis.Math === Math);
