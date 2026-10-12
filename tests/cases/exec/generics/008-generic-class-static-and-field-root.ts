// xl:title 泛型类：静态成员、字段、方法各一份
// xl:judge stdout
// xl:end

class Box<T> {
  static count = 0;
  v: T;
  constructor(v: T) {
    this.v = v;
    Box.count++;
  }
  map<U>(f: (x: T) => U): Box<U> {
    return new Box(f(this.v));
  }
}
const b = new Box(2).map((x) => x * 3);
console.log(b.v, Box.count);
