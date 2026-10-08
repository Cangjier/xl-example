// xl:title Object.freeze / isFrozen / isSealed / isExtensible
// xl:round 291
// xl:judge stdout
// xl:end

const o = Object.freeze({ a: 1 });
console.log(Object.isFrozen(o), Object.isSealed(o), Object.isExtensible(o));
console.log(Object.is(NaN, NaN), Object.is(0, -0), Object.is("a", "a"));
const arr = Object.freeze([1, 2]);
console.log(Object.isFrozen(arr), arr.length);
