// xl:title 构造函数参数属性的三种修饰
// xl:round 291
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class P { constructor(private readonly a: number, public b = 2, protected c?: string) {} sum() { return this.a + this.b + (this.c?.length ?? 0); } }
console.log(new P(1).sum(), new P(1, 5, "ab").sum());
