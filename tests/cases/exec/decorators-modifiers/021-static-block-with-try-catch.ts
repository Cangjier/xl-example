// xl:title 静态块里写 `try/catch`
// xl:round 305
// xl:judge stdout
// xl:end

class C {
  static v: number;
  static {
    try {
      throw new Error("x");
    } catch {
      C.v = 2;
    }
  }
}
console.log(C.v);
