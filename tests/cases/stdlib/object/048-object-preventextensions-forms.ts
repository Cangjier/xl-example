// xl:title preventExtensions / seal / freeze 三档：isExtensible 与两个问法的答案
// xl:round 304
// xl:judge stdout
// xl:end

const a: any = { x: 1 };
const backA = Object.preventExtensions(a);
console.log(backA === a, Object.isExtensible(a), Object.isSealed(a), Object.isFrozen(a));
const b: any = { x: 1 };
Object.seal(b);
console.log(Object.isExtensible(b), Object.isSealed(b), Object.isFrozen(b));
const c: any = { x: 1 };
Object.freeze(c);
console.log(Object.isExtensible(c), Object.isSealed(c), Object.isFrozen(c));
console.log(Object.isSealed({}), Object.isExtensible("s"));
