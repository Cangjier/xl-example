// xl:title 非破坏式的那几支：toSorted / toReversed / with
// xl:judge stdout
// xl:end

const xs = [3, 1, 2];
console.log(xs.toSorted((a, b) => a - b).join(","), xs.join(","));
console.log(xs.toReversed().join(","), xs.join(","));
console.log(xs.with(1, 9).join(","), xs.join(","));
