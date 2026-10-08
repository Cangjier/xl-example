// xl:title 抽象类里的静态成员与子类实现
// xl:round 304
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

abstract class Shape {
  static count = 0;
  abstract area(): number;
  describe(): string { return this.constructor.name + ":" + this.area(); }
}
class Square extends Shape {
  constructor(private side: number) { super(); Shape.count += 1; }
  area(): number { return this.side * this.side; }
}
const s = new Square(3);
console.log(s.describe(), Shape.count, s instanceof Shape);
