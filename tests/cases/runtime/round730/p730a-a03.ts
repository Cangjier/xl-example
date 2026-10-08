// xl:title 生成器对象与生成器函数是两格原型、两个标签
// xl:round 730
// xl:judge stdout
// xl:end
function* g() { yield 1; }
const it = g();
console.log(Object.prototype.toString.call(g), Object.prototype.toString.call(it));
console.log(Object.getPrototypeOf(it) === Object.getPrototypeOf(g));
console.log(Object.keys(Object.getPrototypeOf(g)).length, Object.keys(Object.getPrototypeOf(it)).length);
console.log(Object.getPrototypeOf(Object.getPrototypeOf(g)) === Function.prototype);
