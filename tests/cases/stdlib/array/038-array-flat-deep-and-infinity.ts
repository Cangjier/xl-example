// xl:title flat：深度参数与 Infinity、洞的处置
// xl:round 291
// xl:judge stdout
// xl:end

console.log([1, [2, [3, [4]]]].flat(1).join(","));
console.log([1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
console.log([1, , 2].flat().length);
