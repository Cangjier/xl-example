// xl:title `Object.prototype.toString` 不被 `Function.prototype.toString` 遮住
// xl:round 334
// xl:judge stdout
// xl:end

console.log(Object.prototype.toString.call([]), Object.prototype.toString.call({}));
console.log(Object.prototype.toString.call(1), Object.prototype.toString.call("x"));
console.log(Object.prototype.toString.call(null), Object.prototype.toString.call(undefined));
const f = function () { return 1; };
console.log(Object.prototype.toString.call(f));
console.log(Object.keys(Function.prototype).length, Object.keys(Object.prototype).length);
