// xl:title 带值的 namespace
// xl:round 291
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace N { export const a = 1; export function f() { return a + 1; } }
console.log(N.a, N.f());
