// xl:title for..in 的键序（整数键在前）与原型链
// xl:round 623
// xl:judge stdout
// xl:end

const o: any = { b: 1, 2: 2, a: 3, 1: 4 };
const keys: string[] = [];
for (const k in o) keys.push(k);
console.log(keys.join(","));
const proto = { p: 1 };
const child: any = Object.create(proto);
child.c = 2;
const ks: string[] = [];
for (const k in child) ks.push(k);
console.log(ks.join(","));
