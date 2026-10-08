// xl:title 类：字段、构造函数、方法、方法之间的调用
// xl:judge stdout
// xl:end

class Point {
  x = 0;
  y = 0;
  constructor(x: number, y: number) { this.x = x; this.y = y; }
  sum(): number { return this.x + this.y; }
  scaled(k: number): Point { return new Point(this.x * k, this.y * k); }
  toString(): string { return "(" + this.x + "," + this.y + ")"; }
}
const p = new Point(2, 3);
console.log(p.sum(), p.scaled(2).toString(), "" + p);
