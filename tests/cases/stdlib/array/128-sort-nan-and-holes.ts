// xl:title `sort` 的比较器返回 `NaN`、以及数组里的洞
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [3, 1, 2];
console.log(JSON.stringify(a.sort(() => NaN)));
const h: any = [3, , 1];
console.log(h.length, h.sort().join(","));
console.log(JSON.stringify(Object.keys(h)));
