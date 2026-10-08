// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { } Object.defineProperty(A.prototype, "g", { get() { return 42; }, configurable: true }); console.log(show(new A().g) +
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { }
Object.defineProperty(A.prototype, "g", { get() { return 42; }, configurable: true });
console.log(show(new A().g) + "|" + show(Object.getOwnPropertyDescriptor(A.prototype, "g").enumerable));
