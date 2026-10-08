// xl:title 构造函数参数属性：public / private / readonly 各生成一个实例字段
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class P {
  constructor(public a: number, private b: string, readonly c = true) {}
  show(): string { return this.a + "/" + this.b + "/" + this.c; }
}
const p = new P(1, "x");
console.log(p.show(), p.a, p.c);
