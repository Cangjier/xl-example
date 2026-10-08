// xl:title 把数组 `length` 调小会删尾巴
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2, 3, 4];
a.length = 2;
console.log(a.length, JSON.stringify(a), a[3]);
a.length = 4;
console.log(a.length, JSON.stringify(a));
