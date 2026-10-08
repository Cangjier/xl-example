// xl:title 数组下标键与普通字符串键在枚举上的分工
// xl:round 371
// xl:judge stdout
// xl:end
const a: any = [1, 2];
a.extra = "e";
a[-1] = "neg";
a[1.5] = "frac";
a["2"] = 3;
console.log(a.length, Object.keys(a).join(","), JSON.stringify(a));
console.log(a.extra, a[-1], a["1.5"], a[2]);
console.log(Array.isArray(a), a instanceof Array);
