// xl:title 参数属性的四种修饰：public / private / readonly / 默认值
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class C {
  constructor(public a: number, private b: string, protected readonly c = 3, public d?: number) {}
  show() { return this.a + this.b + this.c + this.d; }
}
const c = new C(1, "x");
console.log(c.show(), c.a, Object.keys(c).join(","));
