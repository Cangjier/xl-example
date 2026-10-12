// xl:title 参数属性带默认值，还有 readonly
// xl:round 304
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Point {
  constructor(public x = 0, public y = 0, private readonly tag = "p") {}
  show(): string { return this.tag + "(" + this.x + "," + this.y + ")"; }
}
console.log(new Point().show(), new Point(1, 2).show(), new Point(3).y);
