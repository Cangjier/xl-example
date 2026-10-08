// xl:title `delete` 打在成员 / 下标 / 调用上
// xl:round 740
// xl:judge stdout
// xl:end
const o: any = { p: 1, m() { return 2; } };
const a: any = [1, 2];
console.log(delete o.p, "p" in o);
console.log(delete a[0], a[0], a.length);
console.log(delete o.nope);
console.log(delete o.m, typeof o.m);
