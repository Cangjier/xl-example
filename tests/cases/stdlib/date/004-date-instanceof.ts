// xl:title Date 的原型格与 instanceof
// xl:judge stdout
// xl:end

console.log(new Date(0) instanceof Date, Object.getPrototypeOf(new Date(0)) === Date.prototype);
console.log(typeof Date, Date.prototype.constructor === Date);
