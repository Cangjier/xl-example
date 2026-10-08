// xl:title 箭头函数的 this 词法绑定与 class 字段箭头
// xl:round 623
// xl:judge stdout
// xl:end

class C {
  v = 3;
  f = () => this.v;
  g() { return (() => this.v)(); }
}
const c = new C();
const f = c.f;
console.log(f(), c.g(), c.f.call({ v: 9 }));
