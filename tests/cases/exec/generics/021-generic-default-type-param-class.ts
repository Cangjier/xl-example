// xl:title 泛型类带默认类型实参
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Holder<T = string> {
  constructor(public value: T) {}
}
console.log(new Holder("a").value, new Holder<number>(2).value);
