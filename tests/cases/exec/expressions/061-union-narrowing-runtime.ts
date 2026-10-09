// xl:title 联合类型的收窄写法：typeof / in / instanceof 三种守卫
// xl:round 323
// xl:judge stdout
// xl:end

function show(v: string | number): string { return typeof v === "string" ? v.toUpperCase() : v.toFixed(1); }
function has(o: { a?: number } | { b?: number }) { return "a" in o ? "A" : "B"; }
class E1 {} class E2 {}
function kind(v: E1 | E2) { return v instanceof E1 ? "e1" : "e2"; }
console.log(show("a"), show(1), has({ a: 1 }), has({ b: 2 }), kind(new E1()), kind(new E2()));
