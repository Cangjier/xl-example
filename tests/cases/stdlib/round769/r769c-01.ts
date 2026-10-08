// xl:title bind / call / apply
// xl:round 769
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number, b: number) { return this.t + '/' + a + '/' + b; } const g: any = f.bind({ t: 'x' }, 1); return g(2); })()));
console.log('02 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number) { return a; } const g: any = f.bind(null, 1); return g.length; })()));
console.log('03 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number) { return a; } const g: any = f.bind(null, 1); return g.name; })()));
console.log('04 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number) { return a; } const g: any = f.bind(null); return g.length + '/' + g.name; })()));
console.log('05 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number) { return a; } const g: any = f.bind(null); return new (g as any)(5); })()));
console.log('06 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number) { this.a = a; } const g: any = f.bind({ z: 1 }); const o: any = new g(3); return o.a + '/' + (o instanceof f); })()));
console.log('07 (function () { function f(this: an', show(() => (function () { function f(this: any) { return this; } const g: any = f.bind(1); return typeof g(); })()));
console.log('08 (function () { function f(this: an', show(() => (function () { function f(this: any) { return this === undefined; } const g: any = f.bind(undefined); return g(); })()));
console.log('09 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number, b: number) { return this.n + a + b; } return f.call({ n: 1 }, 2, 3); })()));
console.log('10 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number, b: number) { return this.n + a + b; } return f.apply({ n: 1 }, [2, 3]); })()));
console.log('11 (function () { function f(this: an', show(() => (function () { function f(this: any, a: number) { return this.n + a; } const g: any = f.bind({ n: 1 }); return g.call({ n: 9 }, 2); })()));
console.log('12 (function () { function f(this: an', show(() => (function () { function f(this: any) { return typeof this; } return f.call(1); })()));
console.log('13 (function () { function f(this: an', show(() => (function () { function f(this: any) { return typeof this; } return f.call('x'); })()));
console.log('14 (function () { function f(this: an', show(() => (function () { function f(this: any) { return this === null ? 'null' : typeof this; } return f.call(null); })()));
console.log('15 (function () { function f(this: an', show(() => (function () { function f(this: any) { return arguments.length; } const g: any = f.bind(null, 1, 2); return g(3); })()));
