// xl:title 构造函数参数属性：public / private / readonly / 默认值
// xl:round 9
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class C {
  constructor(public a: number, private b: string, readonly c = true) {}
  dump() { return this.a + "|" + this.b + "|" + this.c; }
}
const c = new C(1, "x");
console.log(c.dump(), c.a, c.c);
