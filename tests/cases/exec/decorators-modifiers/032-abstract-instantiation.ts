// xl:title 抽象类：子类能造、抽象方法被子类实现
// xl:round 330
// xl:judge stdout
// xl:end

abstract class Shape {
  abstract area(): number;
  describe(): string {
    return this.constructor.name + ":" + this.area();
  }
}
class Square extends Shape {
  side: number;
  constructor(side: number) {
    super();
    this.side = side;
  }
  area(): number {
    return this.side * this.side;
  }
}
console.log(new Square(3).describe());
