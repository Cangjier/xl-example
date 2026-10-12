// xl:title `for..in` 走自有可枚举（原型链上的不算）
// xl:judge stdout
// xl:end

const o: any = { a: 1, b: 2 };
const seen: string[] = [];
for (const k in o) seen.push(k);
console.log(seen.sort().join(","), o.a + o.b);
class A { m() { return 1; } }
const a: any = new A();
a.own = 3;
const keys2: string[] = [];
for (const k in a) keys2.push(k);
console.log(keys2.join(","));
