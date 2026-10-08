// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { m() { function f() { return this === undefined ? "u" : typeof this; } return f(); } } console.log(show(new A().m()));
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { m() { function f() { return this === undefined ? "u" : typeof this; } return f(); } }
console.log(show(new A().m()));
