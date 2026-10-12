// xl:title 字段初始化式里的**箭头**（`f = () => this.v` —— 遍地都是的写法）
// xl:judge stdout
// xl:end

class C {
  v = 1;
  f = () => this.v + 1;
  g = (n: number) => n * this.v;
}
const c = new C();
console.log(c.f(), c.g(5), Object.keys(c).length);
