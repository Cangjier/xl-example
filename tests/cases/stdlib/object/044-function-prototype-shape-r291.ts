// xl:title 函数自带的三格与 prototype 的形状
// xl:round 291
// xl:judge stdout
// xl:end

const f = function () {};
console.log(typeof f.prototype, typeof f.call, typeof f.apply, typeof f.bind);
console.log(Function.prototype.call.length, typeof Function.prototype.bind);
