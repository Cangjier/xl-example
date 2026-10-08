// xl:title new 的类型实参与实参位上的断言混在一起
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Box<T> { constructor(public v: T) {} }
const b = new Box<number>(1);
const c = new Map<string, number>([["a", 1]]);
const dyn = new (class { x = 5; })();
const fromExpr = new (b.v > 0 ? Box : Box)<string>("s");
console.log(b.v, c.get("a"), dyn.x, fromExpr.v);
const withAs = new Box<{ n: number }>({ n: 1 } as { n: number });
console.log(withAs.v.n);
