// xl:title `splice` 的负起点与删除数
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3, 4, 5];
console.log(JSON.stringify(a.splice(-2, 1)));
console.log(JSON.stringify(a));
const b: any = [1, 2, 3];
console.log(JSON.stringify(b.splice(1)));
console.log(JSON.stringify(b));
