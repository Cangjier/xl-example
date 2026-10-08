// xl:title 字段名用保留字（`static default` / `null`）
// xl:round 305
// xl:judge stdout
// xl:end

class C {
  static default = 1;
  null = 2;
}
console.log(C.default, new C().null);
