// xl:title 参数属性 + this 形参 + 重载实现
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Point {
  constructor(public x: number, private y: number, readonly tag = "p") {}
  sum(this: Point, extra: number): number { return this.x + this.y + extra; }
  describe(): string { return this.tag + ":" + this.x + "," + this.y; }
}
const p = new Point(2, 3);
console.log(p.sum(5), p.describe());
function fmt(value: string): string;
function fmt(value: number): string;
function fmt(value: any): string { return typeof value === "number" ? value.toFixed(1) : value.trim(); }
console.log(fmt("  a  "), fmt(2));
