// xl:title 数组下标位上的访问器：读 / `in` / `Object.keys` / `for..in` 的枚举次序与描述符回读
// xl:round 746
// xl:judge stdout
// xl:want pass
// xl:end

const a: any[] = [1, 2, 3];
Object.defineProperty(a, 1, { get() { return 99; }, configurable: true });
console.log(a[1], a.length, JSON.stringify(a), 1 in a);
console.log(Object.keys(a).join(","), Object.getOwnPropertyNames(a).join(","));
const d = Object.getOwnPropertyDescriptor(a, "1") as any;
console.log(d === undefined, typeof d.get, d.get());
const seen: string[] = [];
for (const k in a) seen.push(k);
console.log(seen.join(","));
const b: any[] = [1, 2, 3];
Object.defineProperty(b, "1", { get() { return 7; }, enumerable: true, configurable: true });
console.log(b[1], Object.keys(b).join(","), JSON.stringify(b));
let seen2 = "";
for (const k in b) seen2 += k;
console.log(seen2);
const e: any[] = [];
Object.defineProperty(e, 2, { get() { return 5; }, configurable: true });
console.log(e.length, e[2]);
