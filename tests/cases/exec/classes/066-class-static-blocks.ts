// xl:title 静态块与静态字段的初始化顺序
// xl:round 691
// xl:judge stdout
// xl:end
class C {
  static a = 1;
  static { console.log("block", C.a); C.a = 2; }
  static b = C.a + 1;
}
console.log(C.a, C.b);
