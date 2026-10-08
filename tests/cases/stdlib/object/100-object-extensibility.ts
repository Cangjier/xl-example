// xl:title Object.isExtensible / isFrozen / isSealed 交叉形态
// xl:round 647
// xl:judge stdout
// xl:end

const a = { x: 1 };
console.log(Object.isExtensible(a), Object.isFrozen(a), Object.isSealed(a));
Object.preventExtensions(a);
console.log(Object.isExtensible(a), Object.isFrozen(a), Object.isSealed(a));
const b = Object.seal({ y: 1 });
console.log(Object.isExtensible(b), Object.isFrozen(b), Object.isSealed(b));
const c = Object.freeze({ z: 1 });
console.log(Object.isExtensible(c), Object.isFrozen(c), Object.isSealed(c));
