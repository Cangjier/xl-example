// xl:title `indexOf` 的负 fromIndex 从哪里开始
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2, 1, 2];
console.log(a.indexOf(1, -1), a.indexOf(1, -3), a.indexOf(2, -100));
console.log(a.lastIndexOf(1, -2), a.lastIndexOf(2, -100));
