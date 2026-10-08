// xl:title Symbol.for / keyFor 的注册表与几个内建符号的身份
// xl:judge stdout
// xl:end

console.log(Symbol.for("x") === Symbol.for("x"), Symbol.for("x") === Symbol("x"));
console.log(Symbol.keyFor(Symbol.for("y")), Symbol.keyFor(Symbol("y")));
console.log(typeof Symbol.iterator, typeof Symbol.asyncIterator, Symbol.iterator === Symbol.iterator);
console.log(typeof Symbol.toPrimitive, typeof Symbol.hasInstance, typeof Symbol.toStringTag);
