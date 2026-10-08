// xl:title `new` / `call` / `apply` / `bind` 上的展开实参
// xl:round 724
// xl:judge stdout
// xl:end
class A { a: number; b: number; constructor(a: number, b: number) { this.a = a; this.b = b; } }
const made: any = new (A as any)(...[1, 2] as any);
console.log(made.a, made.b);
function g(a: number, ...rest: any[]) { return a + "/" + rest.join("-"); }
console.log(g.call(null, ...([1, 2, 3] as any)));
console.log(g.apply(null, [1, 2, 3] as any));
console.log(g.call(null, 1, ...[2, 3] as any));
console.log(g.bind(null, ...([1, 2] as any))(3));
