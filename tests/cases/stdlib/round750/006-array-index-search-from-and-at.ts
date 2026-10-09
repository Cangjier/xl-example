// xl:title `Array.prototype` 的 `indexOf` / `includes` / `lastIndexOf` 的起点
// xl:round 750
// xl:judge stdout
// xl:end
const a = [1, 2, 3, 2, 1];
console.log(a.indexOf(2), a.indexOf(2, 2), a.lastIndexOf(2), a.lastIndexOf(2, 2));
console.log(a.indexOf(9), a.includes(9), a.includes(2, 3), a.indexOf(NaN), a.includes(NaN));
const b: any[] = [1, , 3];
console.log(b.indexOf(undefined), b.includes(undefined), b.indexOf(3));
console.log([1, 2, 3].find((v) => v > 1), [1, 2, 3].findLast((v) => v > 1));
console.log([1, 2, 3].findIndex((v) => v > 5), [1, 2, 3].at(-1), [1, 2, 3].at(5));
