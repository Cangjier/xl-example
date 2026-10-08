// xl:title Symbol.for / keyFor / description / toString
// xl:round 623
// xl:judge stdout
// xl:end

const s = Symbol.for("k");
console.log(Symbol.keyFor(s), Symbol.for("k") === s, Symbol.keyFor(Symbol("z")));
console.log(Symbol("d").description, String(Symbol("d")), Symbol("d").toString());
