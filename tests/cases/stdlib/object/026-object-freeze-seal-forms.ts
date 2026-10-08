// xl:title freeze / seal / isFrozen / isSealed 的四格组合
// xl:judge stdout
// xl:end

const f = Object.freeze({ a: 1 });
const s = Object.seal({ b: 1 });
console.log(Object.isFrozen(f), Object.isSealed(f), Object.isFrozen(s), Object.isSealed(s));
console.log(Object.isFrozen({}), Object.isSealed({}), Object.isFrozen([1]));
s.b = 2;
console.log(s.b);
