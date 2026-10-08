// xl:title 抽象成员：abstract 方法与抽象属性只有类型位，子类实现照跑
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

abstract class Shape {
  abstract area(): number;
  abstract name: string;
  describe(): string { return this.name + ":" + this.area(); }
}
class Sq extends Shape {
  name = "sq";
  constructor(private side: number) { super(); }
  area(): number { return this.side * this.side; }
}
console.log(new Sq(3).describe(), new Sq(2).area());
