// xl:title Object.prototype.toString 的各类标签
// xl:round 371
// xl:judge stdout
// xl:end
const cases: unknown[] = [undefined, null, 1, "s", true, {}, [], () => 0, new Map(), new Set(), new Date(0), Symbol("x")];
console.log(cases.map((v) => Object.prototype.toString.call(v)).join(" "));
class C { get [Symbol.toStringTag]() { return "Custom"; } }
console.log(Object.prototype.toString.call(new C()));
