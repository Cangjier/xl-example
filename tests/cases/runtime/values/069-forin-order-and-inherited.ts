// xl:title for..in：整数键在前、继承来的键也在、数组给下标串
// xl:judge stdout
// xl:end

const o: any = { b: 1, a: 2 };
o[2] = "two";
o[1] = "one";
const keys: string[] = [];
for (const k in o) keys.push(k);
console.log(keys.join(","));
const arr = ["x", "y"];
const idx: string[] = [];
for (const i in arr) idx.push(i);
console.log(idx.join(","));
const child: any = Object.create({ inherited: true });
child.own = 1;
const both: string[] = [];
for (const k in child) both.push(k);
console.log(both.join(","));
