// xl:title `for..in` 沿原型链：自有 / 继承 / 被压住 / 不可枚举
// xl:round 340
// xl:judge stdout
// xl:end

const base: any = { b1: 1, b2: 2 };
base.hidden = 3;
Object.defineProperty(base, "hidden", { enumerable: false, value: 3, configurable: true, writable: true });
const child: any = Object.create(base);
child.own = 9;
const seen: string[] = [];
for (const k in child) seen.push(k);
console.log(seen.join(","));
class Shape { m() { return 1; } get g() { return 2; } }
const shape: any = new Shape();
shape.extra = 5;
const keys: string[] = [];
for (const k in shape) keys.push(k);
console.log(keys.join(","), Object.keys(shape).join(","));
const a: any = [10, 20];
const idx: string[] = [];
for (const k in a) idx.push(k);
console.log(idx.join(","));
const shadow: any = Object.create({ dup: "base", only: "base" });
shadow.dup = "own";
const s2: string[] = [];
for (const k in shadow) s2.push(k + "=" + shadow[k]);
console.log(s2.join(","));
