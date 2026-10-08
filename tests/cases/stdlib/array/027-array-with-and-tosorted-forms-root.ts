// xl:title with / toSorted / toReversed / toSpliced 形态（不改原数组）
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
console.log(xs.with(1, 9).join(","), xs.join(","));
console.log(xs.with(-1, 8).join(","));
console.log(xs.toSorted((a, b) => b - a).join(","), xs.toReversed().join(","));
