// xl:title 过掉的形状：`new` + 可选链 / 非空断言（除上面那一格之外都对）
// xl:round 729
// xl:judge stdout
// xl:end
class C { v = 1; m() { return this.v; } }
const o: any = new C();
console.log(o.v, o.m());
console.log((new C())?.["v"], new C().v);
console.log((o as any)!.v, o!.v);
