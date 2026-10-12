// xl:title readonly / public / private / protected / abstract 在值位上的效果
// xl:judge stdout
// xl:end

abstract class Shape {
  abstract area(): number;
  describe(): string { return "area=" + this.area(); }
}
class Square extends Shape {
  private readonly side: number;
  constructor(side: number) { super(); this.side = side; }
  area(): number { return this.side * this.side; }
}
console.log(new Square(3).describe(), new Square(3).area());
