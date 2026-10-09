// xl:title namespace 与函数 / 接口合并 + export 成员
// xl:round 9
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

namespace Util {
  export const VERSION = "1.0";
  export function twice(n: number) { return n * 2; }
  export namespace Inner { export const deep = 3; }
}
console.log(Util.VERSION, Util.twice(21), Util.Inner.deep);
