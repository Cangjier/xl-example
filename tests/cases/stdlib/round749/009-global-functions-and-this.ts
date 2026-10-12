// xl:title 全局函数的返回值与 `this`
// xl:round 749
// xl:judge stdout
// xl:end
console.log(Number("42"), String(42), Boolean(0));
console.log(typeof globalThis, Object.keys({}).length);
const parsed = Number.parseInt("ff", 16);
console.log(parsed, isNaN("abc"), isFinite("12"));
console.log(encodeURIComponent("a b"), decodeURIComponent("a%20b"));
console.log(typeof queueMicrotask, typeof globalThis.Object);
console.log(Array.isArray([]), Array.isArray("s"), Object.prototype.toString.call([]));
