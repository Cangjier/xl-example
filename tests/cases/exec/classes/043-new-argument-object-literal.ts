// xl:title `new` 实参表里的对象字面量（不是类型字面量）
// xl:round 375
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// new Box({ … }) 里那个 { 是**对象字面量**——new 不能把它拉成类型位。
class Box<T> {
  constructor(public v: any) {}
}
const a = new Box({ n: 3 });
console.log("A", a.v.n);
const b = new Box<number>({ n: 4 });
console.log("B", b.v.n);
const c = new Box<{ n: number }>({ n: 5 });
console.log("C", c.v.n);
class Pair {
  constructor(public first: any, public second: any) {}
}
const d = new Pair({ k: 1 }, { k: 2 });
console.log("D", d.first.k, d.second.k);
class Nested {
  constructor(public v: any) {}
}
const e = new Nested({ inner: { deep: 7 } });
console.log("E", e.v.inner.deep);
const f = new Nested([{ n: 8 }][0]);
console.log("F", f.v.n);
const g = new Nested(({ n: 9 }));
console.log("G", g.v.n);
const h = new Nested(new Nested({ n: 10 }));
console.log("H", h.v.v.n);
