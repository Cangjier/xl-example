// xl:title namespace 带值：导出常量与函数
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Math2 {
  export const PI2 = 6;
  export function twice(n: number) { return n * 2; }
}
console.log(Math2.PI2, Math2.twice(21));
