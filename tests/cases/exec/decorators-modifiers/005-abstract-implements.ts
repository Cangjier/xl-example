// xl:title abstract class 被 implements / 抽象成员被子类实现
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

interface Shape { area(): number }
abstract class Base implements Shape {
  abstract area(): number;
  describe(): string { return "area=" + this.area().toFixed(1); }
}
class Sq extends Base { constructor(private s: number) { super(); } area(): number { return this.s * this.s; } }
console.log(new Sq(3).describe());
