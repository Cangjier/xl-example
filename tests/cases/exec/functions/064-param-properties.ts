// xl:title 构造函数参数属性：public / private / readonly / 默认值
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class C {
  constructor(public a: number, private b: string = "b", readonly c = 3) {}
  show() { return this.a + this.b + this.c; }
}
console.log(new C(1).show(), Object.keys(new C(1)).join(","));
