// xl:title Object.getPrototypeOf / 内建原型的来源
// xl:judge stdout
// xl:end

class A {}
console.log(Object.getPrototypeOf(new A()) === A.prototype, A.prototype.constructor === A);
console.log(Object.getPrototypeOf([]) === Array.prototype, Object.getPrototypeOf({}) === Object.prototype);
