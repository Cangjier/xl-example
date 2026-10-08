// xl:title `for...in` 走上原型链、顺序同上
// xl:round 691
// xl:judge stdout
// xl:end
const proto: any = { p1: 1, p2: 2 };
const o: any = Object.create(proto);
o.b = 3; o[2] = 4; o[1] = 5;
const seen: string[] = [];
for (const k in o) seen.push(k);
console.log(seen.join(","));
