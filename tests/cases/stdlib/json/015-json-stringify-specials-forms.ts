// xl:title JSON.stringify 对 undefined / 函数 / 符号 / NaN 的处置
// xl:round 291
// xl:judge stdout
// xl:end

console.log(JSON.stringify(undefined), JSON.stringify(null), JSON.stringify([undefined, () => 1, Symbol("s")]));
console.log(JSON.stringify({ a: undefined, b: () => 1, c: 2 }));
console.log(JSON.stringify(NaN), JSON.stringify(Infinity), JSON.stringify(-0));
