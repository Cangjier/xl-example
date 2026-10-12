// xl:title namespace 与同名 function / class 合并
// xl:round 623
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

function f() { return 1; }
namespace f { export const v = 2; }
class C { m() { return 3; } }
namespace C { export const w = 4; }
console.log(f(), f.v, new C().m(), C.w);
