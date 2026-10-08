// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { #x = 1; static read(o) { return o.#x; } } class B extends A {} try { console.log(show(A.read(new B()))); } catch (e) {
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { #x = 1; static read(o) { return o.#x; } }
class B extends A {}
try { console.log(show(A.read(new B()))); } catch (e) { console.log("throw:" + e.constructor.name); }
