// xl:title 派生类不写构造函数：默认那条要转发实参
// xl:judge stdout
// xl:end

class A {
  n: number;
  constructor(n: number = 1) { this.n = n; }
}
class B extends A {}
class C extends A { constructor() { super(7); } }
console.log(new B(5).n, new C().n, new A().n);
