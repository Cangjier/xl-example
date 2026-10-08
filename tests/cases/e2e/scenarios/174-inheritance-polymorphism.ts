// xl:title 端到端：多态分派（抽象基类 + 三个子类 + instanceof）
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

abstract class Shape {
  abstract area(): number;
  describe() { return this.constructor.name + ":" + this.area(); }
}
class Sq extends Shape { constructor(private s: number) { super(); } area() { return this.s * this.s; } }
class Rect extends Shape { constructor(private w: number, private h: number) { super(); } area() { return this.w * this.h; } }
const shapes: Shape[] = [new Sq(2), new Rect(2, 3)];
for (const s of shapes) console.log(s.describe(), s instanceof Sq, s instanceof Rect);
console.log(shapes.map((s) => s.area()).reduce((a, b) => a + b, 0));
