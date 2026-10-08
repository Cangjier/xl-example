// xl:title `findLast` / `findLastIndex`
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [5, 12, 8, 130, 44];
console.log(a.findLast((x: any) => x > 10));
console.log(a.findLastIndex((x: any) => x > 10));
console.log(a.findLast((x: any) => x > 200));
