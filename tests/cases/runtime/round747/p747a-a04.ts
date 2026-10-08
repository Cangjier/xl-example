// xl:title `this` 的四种绑定与箭头函数的词法 `this`
// xl:round 747
// xl:judge stdout
// xl:end
function show(v: any) { return v === undefined ? "undefined" : typeof v + ":" + String(v); }
const o = { v: 1, m() { return this.v; } };
console.log(o.m());
const f: any = o.m;
try { console.log("direct " + show(f())); } catch (e) { console.log("throw " + (e as Error).constructor.name); }
console.log(o.m.bind({ v: 9 })(), o.m.call({ v: 8 }), o.m.apply({ v: 7 }));
class C { v = 5; m() { return this.v; } }
const c = new C();
console.log(c.m(), (c.m as any).call(c));
function outer() { return (() => typeof this)(); }
console.log(outer.call({ k: 1 }));
const obj = { k: 2, arrow() { return (() => this.k)(); } };
console.log(obj.arrow());
