// xl:title Object.is 的四种边界 + Object.setPrototypeOf 之后 instanceof 跟着变
// xl:judge stdout
// xl:end

console.log(Object.is(NaN, NaN), Object.is(0, -0), Object.is(-0, -0), Object.is(1, "1"));
class A {} class B {}
const o = new A();
Object.setPrototypeOf(o, B.prototype);
console.log(o instanceof A, o instanceof B, Object.getPrototypeOf(o) === B.prototype);
