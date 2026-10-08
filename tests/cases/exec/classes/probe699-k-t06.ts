// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { m() { return 1; } } const a = new A(); const d = Object.getOwnPropertyDescriptor(A.prototype, "m"); console.log(show(d
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { m() { return 1; } }
const a = new A();
const d = Object.getOwnPropertyDescriptor(A.prototype, "m");
console.log(show(d.enumerable) + "|" + show(d.writable) + "|" + show(d.configurable) + "|" + show(a.m()));
