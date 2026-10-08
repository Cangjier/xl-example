// xl:title Symbol 注册表与 description
// xl:round 291
// xl:judge stdout
// xl:end

const a = Symbol("k");
const b = Symbol.for("shared");
console.log(a.description, typeof a, Symbol.keyFor(b), Symbol.keyFor(a));
console.log(Symbol.for("shared") === b, String(a) === "Symbol(k)");
