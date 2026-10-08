// xl:title for-in 走原型链、for-of 只走可迭代
// xl:round 9
// xl:judge stdout
// xl:end

const proto = { p: 1 };
const child = Object.create(proto);
child.c = 2;
const keys: string[] = [];
for (const k in child) keys.push(k);
console.log(keys.sort().join(","));
const arr: any[] = [10, 20];
arr.extra = "x";
const ofs: any[] = [];
for (const v of arr) ofs.push(v);
console.log(ofs.join(","));
