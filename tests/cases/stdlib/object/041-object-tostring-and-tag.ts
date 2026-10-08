// xl:title Object.prototype.toString 的标签表
// xl:round 291
// xl:judge stdout
// xl:end

console.log(Object.prototype.toString.call([]), Object.prototype.toString.call(null));
console.log(Object.prototype.toString.call(new Map()), Object.prototype.toString.call(() => 1));
const o = { [Symbol.toStringTag]: "Custom" };
console.log(Object.prototype.toString.call(o), String(o));
