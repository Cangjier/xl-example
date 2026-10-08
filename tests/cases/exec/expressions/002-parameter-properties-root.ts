// xl:title 构造函数参数属性（`constructor(private x)`）要变出字段来
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class P {
  constructor(public x: number, private y: number, readonly z: number = 0) {}
  sum(): number { return this.x + this.y + this.z; }
}
const p = new P(1, 2, 3);
console.log(p.x, p.sum(), Object.keys(p).length);
