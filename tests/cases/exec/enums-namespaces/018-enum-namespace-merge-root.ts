// xl:title enum 与 namespace 合并：两份都在同一个名字上
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum E { A = 1, B = 2 }
namespace E { export const label = "e"; }
console.log(E.A, E.B, E.label);
