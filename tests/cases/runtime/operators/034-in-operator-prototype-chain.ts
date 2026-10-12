// xl:title `in` 走原型链，`Object.keys` 不走
// xl:round 305
// xl:judge stdout
// xl:end

class A { m() {} }
const a = new A();
console.log("m" in a, "toString" in a, "nope" in a, Object.keys(a).length);
