// xl:title 静态 getter / setter 与它们背后的字段
// xl:judge stdout
// xl:end

class C {
  static _v = 1;
  static get v(): number {
    return C._v * 2;
  }
  static set v(x: number) {
    C._v = x;
  }
}
console.log(C.v);
C.v = 5;
console.log(C.v, C._v);
