// xl:title flat 的深度与 with / toSorted 的不可变形态
// xl:round 323
// xl:judge stdout
// xl:end

console.log([1, [2, [3, [4]]]].flat().join(","), [1, [2, [3, [4]]]].flat(2).join(","));
console.log([1, [2, [3, [4]]]].flat(Infinity).join(","));
const xs = [3, 1, 2];
console.log(xs.with(0, 9).join(","), xs.toSorted().join(","), xs.toReversed().join(","), xs.join(","));
