// xl:title 箭头函数取的是**定义处**的 this
// xl:judge stdout
// xl:end

class Box {
  value = 7;
  get(): number {
    const f = () => this.value;
    return f();
  }
}
console.log(new Box().get());
const o: any = { n: 3, m() { const f = () => this.n; return f(); } };
console.log(o.m());
