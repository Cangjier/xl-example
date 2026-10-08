// xl:title 字段初始化在构造体之前
// xl:round 692
// xl:judge stdout
// xl:end

class A {
  x = 1;
  constructor() {
    console.log(this.x);
    this.x = 2;
  }
}
console.log(new A().x);
