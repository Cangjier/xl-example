// xl:title abstract class / abstract 成员：类型位，但子类要能覆盖
// xl:judge stdout
// xl:end

abstract class Shape {
  abstract area(): number;
  describe(): string { return "area=" + this.area(); }
}
class Square extends Shape {
  side: number;
  constructor(side: number) { super(); this.side = side; }
  area(): number { return this.side * this.side; }
}
console.log(new Square(3).describe(), new Square(2).area());
