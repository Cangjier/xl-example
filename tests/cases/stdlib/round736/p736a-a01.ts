// xl:title `Symbol.for` / `keyFor` 的往返与未注册符号
// xl:round 736
// xl:judge stdout
// xl:end
const a = Symbol.for("k1");
const b = Symbol.for("k1");
console.log(a === b, Symbol.keyFor(a));
console.log(Symbol.keyFor(Symbol("k2")));
console.log(typeof Symbol.keyFor(a));
