// xl:title 带类型实参的 `new`：实参表按顶层逗号切段（不是逗号表达式）
// xl:round 374
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// new Foo<T>(a, b, c) 里那个括号是**实参表**——里面的逗号是分隔符。
class Pair<T> {
  constructor(public first: T, public second: T) {}
}
const p = new Pair<number>(1, 2);
console.log("A", p.first, p.second, Object.keys(p).join(","));
class Triple<T> {
  constructor(public a: number, public b: number, public c: number) {}
}
const t = new Triple<string>(3, 4, 5);
console.log("B", t.a, t.b, t.c);
class Var<T, U> {
  constructor(public x: number, public y: number, public z: number) {}
}
const v = new Var<string, boolean>(6, 7, 8);
console.log("C", v.x, v.y, v.z);
namespace NS { export class Deep<T> { constructor(public n: number, public m: number) {} } }
const d = new NS.Deep<number>(9, 10);
console.log("D", d.n, d.m);
const nested = new Pair<Pair<number>>(new Pair<number>(1, 2), new Pair<number>(3, 4));
console.log("F", nested.first.second, nested.second.first);
