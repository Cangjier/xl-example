// xl:title 枚举写在函数体里面
// xl:round 304
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function pick(which: string): string {
  enum Mode { A = "a", B = "b" }
  return which === "a" ? Mode.A : Mode.B;
}
console.log(pick("a"), pick("z"), pick("b"));
