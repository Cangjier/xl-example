// xl:title 嵌套一层的 namespace
// xl:round 291
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Outer { export namespace Inner { export const v = 2; } export const w = Inner.v + 1; }
console.log(Outer.w, Outer.Inner.v);
