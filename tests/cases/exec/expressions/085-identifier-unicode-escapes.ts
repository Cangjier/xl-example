// xl:title 标识符写成 `\uXXXX` / `\u{…}`：声明的名字就是它解出来的那个
// xl:round 381
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// TS 的规矩：标识符可以写成转义形式，**它的名字是解出来的那个**
// （TS 的 AST `text` 也是解出来的那个）——所以声明处与使用处必须比同一个字符串。
const \u0061bc = 1;
console.log("A", abc);
const caf\u00e9 = 2;
console.log("B", café);
const 日本語 = 4;
console.log("D", 日本語);
function f\u0066(a: number): number { return a + 1; }
console.log("E", ff(1));
class C\u006cass { v = 8; \u006dethod(): number { return 9; } }
console.log("G", new Class().v, new Class().method());
const mixed = \u0061bc + caf\u00e9 + ff(0);
console.log("H", mixed, typeof f\u0066);
