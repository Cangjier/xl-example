// xl:title 枚举与 namespace 合并
// xl:round 291
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

enum E { A = 1 }
namespace E { export const extra = 2; }
console.log(E.A, E.extra);
