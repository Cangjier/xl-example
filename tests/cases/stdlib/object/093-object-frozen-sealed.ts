// xl:title Object.isFrozen / isSealed / preventExtensions / getPrototypeOf
// xl:round 623
// xl:judge stdout
// xl:end

const a = Object.freeze({ x: 1 });
const b = Object.seal({ y: 2 });
console.log(Object.isFrozen(a), Object.isSealed(a), Object.isFrozen(b), Object.isSealed(b));
console.log(Object.isExtensible(a), Object.isExtensible({}));
console.log(Object.getPrototypeOf([]) === Array.prototype, Object.getPrototypeOf({}) === Object.prototype);
