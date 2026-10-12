// xl:title 点名：Object 的 hasOwn / is / isExtensible / 原型与自有属性那几格
// xl:judge stdout
// xl:end

const o = { a: 1 };
console.log(Object.hasOwn(o, "a"), Object.hasOwn(o, "toString"), Object.hasOwn(o, "b"));
console.log(Object.is(1, 1), Object.is(0, -0), Object.is(NaN, NaN), Object.is("a", "a"));
console.log(Object.isExtensible(o), Object.isFrozen(o), Object.isSealed(o));
console.log(Object.getOwnPropertyNames(o).join(","), Object.keys(o).join(","));
console.log(Object.getOwnPropertySymbols(o).length);
console.log(typeof Object.getOwnPropertyDescriptor, typeof Object.getOwnPropertyDescriptors);
console.log(typeof Object.getOwnPropertyDescriptor(o, "a"), typeof Object.getOwnPropertyDescriptors);
console.log(typeof Object.setPrototypeOf, typeof Object.create);
console.log(Object.getPrototypeOf({}) === Object.prototype, Object.getPrototypeOf(Object.create(null)));
