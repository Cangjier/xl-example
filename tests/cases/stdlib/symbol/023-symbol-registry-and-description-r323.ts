// xl:title Symbol.for / keyFor / description 与 well-known 表
// xl:round 323
// xl:judge stdout
// xl:end

const s = Symbol.for("k");
console.log(Symbol.keyFor(s), s.description, Symbol.for("k") === s);
console.log(Symbol.iterator.description, typeof Symbol.asyncIterator, Symbol("x").description);
