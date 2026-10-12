// xl:title frozen / sealed 之后的可写性与可枚举性
// xl:round 678
// xl:judge stdout
// xl:end

const f: any = Object.freeze({ a: 1 });
const s: any = Object.seal({ a: 1 });
console.log(Object.isFrozen(f), Object.isSealed(f), Object.isExtensible(f));
console.log(Object.isFrozen(s), Object.isSealed(s), Object.isExtensible(s));
console.log(Object.keys(f).join(","), Object.keys(s).join(","));
console.log(Object.getOwnPropertyDescriptor(f, "a").writable);
console.log(Object.getOwnPropertyDescriptor(s, "a").writable);
