// xl:title hasOwnProperty / in / getPrototypeOf 在继承链上的分工
// xl:judge stdout
// xl:end

class Base { m() { return 1; } }
class Sub extends Base { n() { return 2; } }
const s = new Sub();
console.log(s.hasOwnProperty("n"), s.hasOwnProperty("m"), "m" in s, "z" in s);
console.log(Object.getPrototypeOf(s) === Sub.prototype, Object.getPrototypeOf(Sub.prototype) === Base.prototype);
console.log(Object.getOwnPropertyNames(s).length, Object.keys(s).length);
