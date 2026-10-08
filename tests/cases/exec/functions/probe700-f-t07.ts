// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { m() { return "m"; } n = function () { return typeof this; }; } console.log(show(new A().n()) + "|" + show(new A().m())
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { m() { return "m"; } n = function () { return typeof this; }; }
console.log(show(new A().n()) + "|" + show(new A().m()));
