// xl:title `flat` 的深度与 `concat` 的嵌套形态
// xl:round 331
// xl:judge stdout
// xl:end

console.log(JSON.stringify([1, [2, [3, [4]]]].flat()));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(2)));
console.log(JSON.stringify([1, [2, [3, [4]]]].flat(Infinity)));
console.log(JSON.stringify([1].concat([2, 3], 4, [[5]])));
