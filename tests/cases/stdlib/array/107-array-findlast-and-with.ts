// xl:title Array.prototype：findLast / findLastIndex / toReversed / toSorted / with
// xl:round 9
// xl:judge stdout
// xl:end

const a = [1, 2, 3, 4];
console.log(a.findLast((x) => x % 2 === 0), a.findLastIndex((x) => x < 3));
console.log(JSON.stringify(a.toReversed()), JSON.stringify(a.toSorted((x, y) => y - x)));
console.log(JSON.stringify(a.with(1, 9)), JSON.stringify(a));
