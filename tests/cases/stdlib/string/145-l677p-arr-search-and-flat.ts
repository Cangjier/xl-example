// xl:title 点名：findLast / findLastIndex / at / reduceRight / flat / flatMap
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.findLast((n) => n % 2 === 0), xs.findLastIndex((n) => n % 2 === 0));
console.log(xs.at(-1), xs.at(0), xs.at(9), [].at(0));
console.log(xs.reduceRight((acc, n) => acc + String(n), ""));
console.log([1, [2, [3]]].flat().join(","), [1, [2, [3]]].flat(2).join(","), [1, [2]].flat(0).join(","));
console.log([1, 2].flatMap((n) => [n, n * 10]).join(","), [1, 2].flatMap((n) => n).join(","));
console.log([1, 2, 3].copyWithin(0, 1).join(","), [1, 2, 3].fill(9, 1).join(","));
console.log([3, 10, 1].sort().join(","), [3, 10, 1].sort((a, b) => a - b).join(","));
