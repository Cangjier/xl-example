// xl:title 类方法的 `length` / `name`
// xl:round 305
// xl:judge stdout
// xl:end

class C {
  m(a: number, b = 1, ...rest: number[]) { return a + b + rest.length; }
}
console.log(C.prototype.m.length, C.prototype.m.name, new C().m(1));
