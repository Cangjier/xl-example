// xl:title `Symbol`：`for` / `keyFor` / `description` / 知名符号的存在
// xl:round 748
// xl:judge stdout
// xl:end
const s1 = Symbol.for("k");
const s2 = Symbol.for("k");
console.log(s1 === s2, Symbol.keyFor(s1), Symbol.keyFor(Symbol("no")));
const s3 = Symbol("desc");
console.log(s3.description, String(s3), typeof s3, s3 === Symbol("desc"));
console.log(typeof Symbol.iterator, typeof Symbol.asyncIterator, typeof Symbol.toPrimitive, typeof Symbol.hasInstance);
console.log(Symbol.iterator === Symbol.iterator, typeof Symbol.for("x").toString());
