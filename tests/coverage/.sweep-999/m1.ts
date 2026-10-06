function make(n: number) { return n * 2; }
namespace make {
  export const version = "1.0";
  export function help() { return "help:" + version; }
}
console.log(make(3), make.version, make.help());
