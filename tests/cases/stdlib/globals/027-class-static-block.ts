// xl:title 类的 static {} 初始化块（按顺序跑）
// xl:round 623
// xl:judge stdout
// xl:end

class C {
  static a: number;
  static b: number;
  static { C.a = 1; }
  static { C.b = C.a + 1; }
}
console.log(C.a, C.b);
