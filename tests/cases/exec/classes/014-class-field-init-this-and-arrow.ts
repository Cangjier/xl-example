// xl:title 字段初始化式里用 `this` 与箭头函数捕获 `this`
// xl:judge stdout
// xl:end

class C {
  n = 5;
  doubled = this.n * 2;
  arrow = () => this.n + 1;
  m(): number { return this.arrow(); }
}
const c = new C();
console.log(c.doubled, c.arrow(), c.m(), c.n);
const detached = c.arrow;
console.log(detached());
