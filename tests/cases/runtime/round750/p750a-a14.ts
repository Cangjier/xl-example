// xl:title `typeof` / `instanceof` / `Array.isArray` 在包装对象与原始值上
// xl:round 750
// xl:judge stdout
// xl:end
console.log(typeof new Number(1), typeof 1, typeof Object(1));
console.log(new Number(1) instanceof Number, Object(1) instanceof Number, 1 instanceof Number);
console.log(Array.isArray(Object(1) as any), Array.isArray([1]), Array.isArray("a" as any));
console.log(typeof null, typeof undefined, typeof (() => {}), typeof Symbol());
console.log([] instanceof Array, [] instanceof Object, "s" instanceof String, true instanceof Boolean);
console.log(Object.prototype.toString.call(1), Object.prototype.toString.call("s"), Object.prototype.toString.call(true));
