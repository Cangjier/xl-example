// xl:title 泛型类的静态成员与实例字段
// xl:round 330
// xl:judge stdout
// xl:end

class Box<T> {
  static count = 0;
  value: T;
  constructor(value: T) {
    this.value = value;
    Box.count = Box.count + 1;
  }
  map<U>(fn: (value: T) => U): Box<U> {
    return new Box<U>(fn(this.value));
  }
}
const one = new Box<number>(2);
const two = one.map((n) => String(n * 3));
console.log(one.value, two.value, Box.count);
