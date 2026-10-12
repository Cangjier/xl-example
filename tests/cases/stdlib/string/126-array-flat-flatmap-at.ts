// xl:title flat / flatMap / at / findLast 的边界
// xl:round 8
// xl:judge stdout
// xl:end

const a = [1, [2, [3, [4]]]];
console.log(JSON.stringify(a.flat()), JSON.stringify(a.flat(2)), JSON.stringify(a.flat(Infinity)));
console.log(JSON.stringify([1, 2].flatMap((x) => [x, x * 10])));
console.log([1, 2, 3].at(-1), [1, 2, 3].at(0), [1, 2, 3].at(9));
console.log([1, 2, 3, 4].findLast((x) => x % 2 === 1));
