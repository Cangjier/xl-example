// xl:title Array 的 copy 家族与 findLast
// xl:round 651
// xl:judge stdout
// xl:end

const xs = [3, 1, 2];
console.log(xs.with(1, 9).join(","), xs.join(","));
console.log(xs.toSorted().join(","), xs.toSorted((a, b) => b - a).join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.toSpliced(1, 1, 8, 9).join(","));
console.log(xs.findLast((x) => x < 3), xs.findLastIndex((x) => x < 3), xs.at(-1));
