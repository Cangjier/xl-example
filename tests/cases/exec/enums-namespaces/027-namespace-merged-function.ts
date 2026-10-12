// xl:title 函数与命名空间合并（挂静态格）
// xl:round 304
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function make(n: number): number { return n * 2; }
namespace make {
  export const version = "1.0";
  export function help(): string { return "help:" + version; }
}
console.log(make(3), make.version, make.help());
