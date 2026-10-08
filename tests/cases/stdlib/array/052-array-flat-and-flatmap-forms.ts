// xl:title flat / flatMap 的深度与空结果
// xl:round 304
// xl:judge stdout
// xl:end

console.log([1, [2, [3, [4]]]].flat().length, [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
console.log([1, 2].flatMap((x) => (x === 1 ? [] : [x, x])).join(","));
