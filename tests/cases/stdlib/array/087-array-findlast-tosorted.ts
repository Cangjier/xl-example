// xl:title Array.findLast / findLastIndex / toSorted / toReversed / with
// xl:round 623
// xl:judge stdout
// xl:end

const a = [5, 1, 4, 2];
console.log(a.findLast((x) => x % 2 === 0), a.findLastIndex((x) => x > 3));
console.log(a.toSorted((x, y) => x - y).join(","), a.join(","));
console.log(a.toReversed().join(","), a.with(1, 9).join(","), a.join(","));
