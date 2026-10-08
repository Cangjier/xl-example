// xl:title `copyWithin` / `fill` 的负区间
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.copyWithin(0, 3)));
console.log(JSON.stringify(a.fill(9, -2)));
console.log(JSON.stringify([1, 2, 3].copyWithin(-2, 0)));
