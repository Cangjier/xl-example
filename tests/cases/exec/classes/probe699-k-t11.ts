// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { m() { return 1; } } const o = { m: () => 2 }; console.log(show(A.prototype.m.call(o)) + "|" + show(A.prototype.m.apply
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { m() { return 1; } }
const o = { m: () => 2 };
console.log(show(A.prototype.m.call(o)) + "|" + show(A.prototype.m.apply(o)) + "|" + show(A.prototype.m.bind(o)()));
