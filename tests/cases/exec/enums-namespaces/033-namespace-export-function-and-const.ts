// xl:title 命名空间导出函数与常量，再从外面调用
// xl:round 305
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Util {
  export const base = 10;
  export function add(n: number): number { return n + base; }
}
console.log(Util.add(1), Util.base, typeof Util);
