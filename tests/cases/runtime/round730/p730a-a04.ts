// xl:title 三格构造对象自己那几格（name / length / typeof / prototype / 标签）
// xl:round 730
// xl:judge stdout
// xl:end
const gc = (function* () {}).constructor;
const ac = (async function () {}).constructor;
console.log(gc.name, gc.length, typeof gc);
console.log(ac.name, ac.length, typeof ac);
console.log(gc.prototype === Object.getPrototypeOf(function* () {}));
console.log(gc.prototype.constructor === gc, typeof gc.prototype.constructor);
