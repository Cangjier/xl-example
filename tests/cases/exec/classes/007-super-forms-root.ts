// xl:title `super` 的三种用法：构造、方法、方法带展开
// xl:judge stdout
// xl:end

class A {
  n: number;
  constructor(n: number) { this.n = n; }
  m(...xs: number[]): number { return xs.length + this.n; }
}
class B extends A {
  constructor() { super(10); }
  m(...xs: number[]): number { return super.m(...xs) * 2; }
  other(): number { return super.m(1, 2, 3); }
}
const b = new B();
console.log(b.n, b.m(1, 2), b.other());
