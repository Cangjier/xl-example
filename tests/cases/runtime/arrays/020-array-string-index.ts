// xl:title 数组下标写字符串与写数字是同一格
// xl:round 305
// xl:judge stdout
// xl:end

const a: any = [1, 2, 3];
a["1"] = 20;
console.log(a[1], a["1"], a.length);
