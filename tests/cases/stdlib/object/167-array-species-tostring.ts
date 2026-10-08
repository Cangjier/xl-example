// xl:title `Object.prototype.toString` 对数组 / 函数 / null 的标签
// xl:round 691
// xl:judge stdout
// xl:end
console.log(Object.prototype.toString.call([]), Object.prototype.toString.call({}));
console.log(Object.prototype.toString.call(function () {}), Object.prototype.toString.call(null));
console.log(Object.prototype.toString.call(1), Object.prototype.toString.call("a"));
