// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { get x() { return 1; } } class B extends A { get x() { return 2; } } console.log(show(new B().x) + "|" + show(Object.ge
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { get x() { return 1; } }
class B extends A { get x() { return 2; } }
console.log(show(new B().x) + "|" + show(Object.getOwnPropertyDescriptor(B.prototype, "x").get !== undefined));
