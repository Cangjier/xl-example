// xl:title for-in 只走可枚举的，非枚举的名字不出现
// xl:round 678
// xl:judge stdout
// xl:end

const proto = { inherited: 1 };
const o: any = Object.create(proto);
o.a = 1;
o.b = 2;
Object.defineProperty(o, "hidden", { value: 3, enumerable: false });
const keys: string[] = [];
for (const k in o) keys.push(k);
console.log(keys.sort().join(","));
console.log(Object.keys(o).join(","));
