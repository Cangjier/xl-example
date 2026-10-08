// xl:title concat 的多实参与嵌套、flat 的两档
// xl:judge stdout
// xl:end

console.log([1].concat([2, 3], 4, [[5]]).length);
console.log(JSON.stringify([1].concat([2], 3)));
console.log([1, [2, [3, [4]]]].flat().length, [1, [2, [3, [4]]]].flat(2).length);
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
