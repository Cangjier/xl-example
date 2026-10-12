// xl:title 抽象类：抽象方法与字段在子类上落地
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

abstract class Shape {
  abstract area(): number;
  name = "shape";
  describe() { return this.name + ":" + this.area(); }
}
class Sq extends Shape {
  name = "sq";
  constructor(private side: number) { super(); }
  area() { return this.side * this.side; }
}
console.log(new Sq(3).describe());
