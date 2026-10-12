// xl:title Array.at / flat / fill（含负下标与深度）
// xl:judge stdout
// xl:end

console.log([1, 2, 3].at(0), [1, 2, 3].at(-1), [1, 2, 3].at(9));
console.log([1, [2, [3, [4]]]].flat().length, [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, 2, 3, 4].fill(0).join(","), [1, 2, 3, 4].fill(9, 1, 3).join(","));
