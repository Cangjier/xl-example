// xl:title 下标键 / length 键 / 字符串键在数组上的分工
// xl:round 371
// xl:judge stdout
// xl:end
const xs: any[] = [1, 2, 3];
xs["3"] = 4;
console.log(xs.length, JSON.stringify(xs));
xs["01"] = 5;
console.log(xs.length, xs["01"]);
console.log(Object.keys(xs).join(","));
console.log(JSON.stringify(Object.keys([, , 1])));
