// xl:title 函数与命名空间合并：静态格挂在函数值自己身上
// xl:round 323
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function make(n: number) { return n * 2; }
namespace make {
  export const version = "1.0";
  export function help() { return "help:" + version; }
}
console.log(make(3), make.version, make.help());
