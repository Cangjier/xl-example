// xl:title Function.prototype：call / apply / bind 的 this 与实参形态
// xl:judge stdout
// xl:end

function f(this: any, a: number, b: number) { return this.base + a + b; }
const obj = { base: 10 };
console.log(f.call(obj, 1, 2), f.apply(obj, [3, 4]));
const bound = f.bind(obj, 5);
console.log(bound(6), bound.length, typeof bound);
class C { v: number; constructor(v: number) { this.v = v; } get() { return this.v; } }
const g = new C(1).get;
console.log(g.call(new C(9)));
