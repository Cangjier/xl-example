// xl:title Symbol.for / keyFor 的注册表与 identity
// xl:judge stdout
// xl:end

const a = Symbol.for("shared");
const b = Symbol.for("shared");
const c = Symbol("shared");
console.log(a === b, a === c, Symbol.keyFor(a), Symbol.keyFor(c));
console.log(typeof Symbol.keyFor(Symbol.for("x")), a.toString() === c.toString());
