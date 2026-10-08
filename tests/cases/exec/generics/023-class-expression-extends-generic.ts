// xl:title 类表达式 `extends` 一个泛型基类
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Base<T> {
  constructor(public value: T) {}
  get(): T { return this.value; }
}
const Sub = class extends Base<number> {
  double(): number { return this.value * 2; }
};
const s = new Sub(3);
console.log(s.get(), s.double(), s instanceof Base);
