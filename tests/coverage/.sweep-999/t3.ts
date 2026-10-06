function make(n: number) { return n * 2; }
namespace make { export const version = "1.0"; }
console.log(typeof make, make(3), (make as any).version);
