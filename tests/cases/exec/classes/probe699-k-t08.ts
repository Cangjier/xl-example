// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { x = 1; } class B extends A { x = 2; m() { return super.x; } } console.log(show(new B().m()) + "|" + show(new B().x));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { x = 1; }
class B extends A { x = 2; m() { return super.x; } }
console.log(show(new B().m()) + "|" + show(new B().x));
