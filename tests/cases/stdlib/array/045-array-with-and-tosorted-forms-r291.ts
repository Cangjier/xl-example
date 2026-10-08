// xl:title toSorted / toReversed / with 三种不改原数组的写法
// xl:round 291
// xl:judge stdout
// xl:end

const xs = [3, 1, 2];
console.log(xs.toSorted().join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(0, 9).join(","), xs.join(","));
console.log(xs.toSorted((a, b) => b - a).join(","));
