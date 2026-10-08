// xl:title `at` 的负下标与越界
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3];
console.log(a.at(-1), a.at(-4), a.at(3));
console.log("abc".at(-1), "abc".at(9));
