// xl:title enum 当 switch 的分派键（**函数体里**用枚举名）
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum Kind { A = "a", B = "b", C = "c" }
function weight(k: Kind): number {
  switch (k) {
    case Kind.A: return 1;
    case Kind.B: return 2;
    case Kind.C: return 3;
    default: return 0;
  }
}
console.log(weight(Kind.A), weight(Kind.B), weight(Kind.C), Kind.B);
