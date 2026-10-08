// xl:title 参数属性：进构造函数就挂在实例上
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Point {
  constructor(public x: number, private y: number, readonly z = 3) {}
  sum() { return this.x + this.y + this.z; }
}
const p = new Point(1, 2);
console.log(p.x, p.sum(), Object.keys(p).join(","));
