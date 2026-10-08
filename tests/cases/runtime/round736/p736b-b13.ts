// xl:title `Object.hasOwn` / `Object.is` / `Object.getPrototypeOf` 的边角
// xl:round 736
// xl:judge stdout
// xl:end
console.log(Object.hasOwn({ a: 1 }, "a"), Object.hasOwn({}, "toString"));
console.log(Object.is(-0, 0), Object.is(NaN, NaN), Object.is(1, 1));
console.log(Object.getPrototypeOf([]) === Array.prototype, Object.getPrototypeOf("s") === String.prototype);
try { console.log(Object.getPrototypeOf(null)); } catch (e: any) { console.log("throw", e.constructor.name); }
