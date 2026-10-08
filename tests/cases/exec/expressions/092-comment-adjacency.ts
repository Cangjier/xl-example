// xl:title 注释夹在语法相邻位置之间（new / for-of / 字段 / 元组成员）
// xl:round 631
// xl:judge stdout
// xl:end

class A {
  v: number;
  constructor(v: number) {
    this.v = v;
  }
}
class B {
  x /* c */ = 1;
  y /* c */ ?: number;
}
const a = new /* c */ A(7);
let sum = 0;
for (const n /* in */ of [1, 2, 3]) {
  sum += n;
}
type T = [p /* c */?: number, ...rest /* c */: string[]];
const t: T = [1, "a"];
console.log(a.v, new B().x, sum, t.length);
