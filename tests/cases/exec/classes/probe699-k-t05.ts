// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { static m() { return 1; } } class B extends A {} console.log(show(B.m()) + "|" + show(Object.getPrototypeOf(B) === A) +
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { static m() { return 1; } }
class B extends A {}
console.log(show(B.m()) + "|" + show(Object.getPrototypeOf(B) === A) + "|" + show(B.hasOwnProperty("m")));
