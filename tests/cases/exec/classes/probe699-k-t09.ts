// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { static x = 1; } class B extends A { static m() { return super.x; } } console.log(show(B.m()));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { static x = 1; }
class B extends A { static m() { return super.x; } }
console.log(show(B.m()));
