// xl:title 数组的增长与 length 直接赋值
// xl:round 623
// xl:judge stdout
// xl:end

const a: number[] = [];
a[3] = 1;
console.log(a.length, a.join(","), 0 in a);
a.length = 2;
console.log(a.length, a.join(","));
a.length = 4;
console.log(a.join(","), a[3]);
