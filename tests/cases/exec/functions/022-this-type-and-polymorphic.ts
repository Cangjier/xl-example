// xl:title this 类型：返回 this、链式调用
// xl:judge stdout
// xl:end

class C {
  v = 0;
  set(n: number): this {
    this.v = n;
    return this;
  }
}
const c = new C().set(1).set(2);
console.log(c.v, c instanceof C);
