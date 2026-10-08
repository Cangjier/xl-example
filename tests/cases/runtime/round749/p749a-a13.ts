// xl:title 调用形状：`call` / `apply` / `bind` 的返回值与 `this`
// xl:round 749
// xl:judge stdout
// xl:end
function f(this: any, a: number, b: number) { return `${this.v}:${a}:${b}`; }
console.log(f.call({ v: 1 }, 2, 3), f.apply({ v: 4 }, [5, 6]));
const bound = f.bind({ v: 7 }, 8);
console.log(bound(9), bound.length, bound.name);
console.log(f.call(null as any, 1, 2).startsWith("undefined"), typeof f.apply);
class C { v = 1; m(...xs: number[]) { return this.v + xs.length; } }
const c = new C();
console.log(c.m.call({ v: 5 }, 1, 2), C.prototype.m.length);
