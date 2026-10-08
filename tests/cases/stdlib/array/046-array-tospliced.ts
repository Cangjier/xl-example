// xl:title Array.prototype.toSpliced / toReversed（不改原数组）
// xl:round 304
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.toSpliced(1, 2, "a", "b").join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
