// xl:title `toSpliced` / `with` 不改原数组
// xl:round 305
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
console.log(xs.toSpliced(1, 1, 9).join(","), xs.with(0, 7).join(","), xs.join(","));
