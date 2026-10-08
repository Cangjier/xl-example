// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class A { } A.prototype[Symbol.toStringTag] = "Custom"; console.log(show(Object.prototype.toString.call(new A())) + "|" + show(S
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class A { }
A.prototype[Symbol.toStringTag] = "Custom";
console.log(show(Object.prototype.toString.call(new A())) + "|" + show(String(new A()).startsWith("[object")));
