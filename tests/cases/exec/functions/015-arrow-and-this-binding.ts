// xl:title 箭头函数的 this 来自定义处：类字段箭头 / 嵌套箭头 / 回调
// xl:judge stdout
// xl:end

class Greeter {
  name = "g";
  arrow = () => this.name;
  nested = () => (() => this.name)();
  regular() { return [1].map(() => this.name)[0]; }
}
const g = new Greeter();
const loose = g.arrow;
console.log(loose(), g.nested(), g.regular());
