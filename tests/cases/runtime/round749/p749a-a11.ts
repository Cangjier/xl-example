// xl:title `for…in`：原型链上的可枚举键与 `null` 原型
// xl:round 749
// xl:judge stdout
// xl:end
const base: any = { p: 1 };
const child: any = Object.create(base);
child.c = 2;
const seen: string[] = [];
for (const k in child) seen.push(k);
console.log(seen.sort().join(","));
const bare: any = Object.create(null);
bare.x = 1;
const seen2: string[] = [];
for (const k in bare) seen2.push(k);
console.log(seen2.join(","), Object.keys(bare).join(","), Object.getPrototypeOf(bare) === null);
const arr: any = [10, 20];
arr.extra = "e";
const seen3: string[] = [];
for (const k in arr) seen3.push(k);
console.log(seen3.join(","));
