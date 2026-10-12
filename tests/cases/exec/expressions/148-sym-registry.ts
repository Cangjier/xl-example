// xl:title Symbol.for / keyFor 的全局注册表与它和 Symbol() 的区别
// xl:round 678
// xl:judge stdout
// xl:end

const a = Symbol.for("shared");
const b = Symbol.for("shared");
const c = Symbol("shared");
console.log(a === b, a === c);
console.log(Symbol.keyFor(a), Symbol.keyFor(c));
console.log(typeof a, typeof c);
