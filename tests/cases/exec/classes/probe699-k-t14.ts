// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { static #count = 0; static bump() { return ++A.#count; } } console.log(show(A.bump()) + "|" + show(A.bump()));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { static #count = 0; static bump() { return ++A.#count; } }
console.log(show(A.bump()) + "|" + show(A.bump()));
