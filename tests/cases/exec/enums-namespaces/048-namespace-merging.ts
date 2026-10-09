// xl:title namespace 与函数 / 类 / 枚举合并
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
function build(): string { return "build"; }
namespace build { export const tag = "fn"; }
class Widget { v = 1; }
namespace Widget { export const kind = "cls"; }
enum Mode { On = 1 }
namespace Mode { export const label = "mode"; }
console.log(build(), build.tag, new Widget().v, Widget.kind, Mode.On, Mode.label);
