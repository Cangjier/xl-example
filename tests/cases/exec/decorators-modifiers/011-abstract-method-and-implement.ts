// xl:title 抽象方法 + 子类实现 + instanceof
// xl:judge stdout
// xl:end

abstract class Shape {
  abstract area(): number;
  describe(): string {
    return "area=" + this.area();
  }
}
class Sq extends Shape {
  s: number;
  constructor(s: number) {
    super();
    this.s = s;
  }
  area(): number {
    return this.s * this.s;
  }
}
const q = new Sq(3);
console.log(q.area(), q.describe(), q instanceof Shape);
