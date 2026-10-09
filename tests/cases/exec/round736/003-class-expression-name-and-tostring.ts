// xl:title 类表达式的 `name` 与 `toString` 形状
// xl:round 736
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p736c-c06`；正文一字未动）。
// 判定点只有一个：**类表达式当值时自己的那一格**——`name` 取被赋的名字
// （写了自己的名字就取自己的）、`new` 一个匿名的类表达式拿到实例、
// `String(类)` 以 `class` 开头。
// （同族的 `name` 与「`new` 的被调者形状」在 `exec/expressions/248-class-expressions-and-new`，
//  那条是第 787 轮并出来的；本条多钉的是 `toString` 的开头两格。）
const C = class Named {};
const D = class {};
console.log(C.name, D.name);
const inst = new (class { m() { return 1; } })();
console.log(inst.m(), typeof inst.constructor);
console.log(String(C).indexOf("class") === 0, C.name.length);
