// xl:title 类型位上的 abstract new：值位只是一个类
// xl:judge stdout
// xl:end

type Ctor<T> = abstract new (x: number) => T;
class A {
  x: number;
  constructor(x: number) {
    this.x = x;
  }
}
const C: Ctor<A> = A;
console.log(new C(4).x);
