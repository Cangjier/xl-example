// xl:title 打头一元运算符**后面**的尖括号断言（`!<T>x` / `~<T>x`）——**还没修**
// xl:round 379
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
// 打头的一元运算符后面跟尖括号断言：Node 给 false / -1，本仓整段投成一个裸的符号节点
// （**感叹号**报 ExclamationToken、**波浪号**报 TildeToken）⇒ 降级期 unimplemented: expression …。
// **边界量清了**：!a / !!a / !(a < 2) 都是好的（c379-ex-angle-assertion-operand-positions
// 那条语料守着）——**打头的一元运算符后面紧跟 <T>** 这一格全都不行 ✗，
// 而两个符号各自报自己那一个 ⇒ 同一个根子：整段被投成了一个裸的符号节点。
const b: unknown = 0;
console.log(!<boolean>b);
const c: unknown = 1;
console.log(!<boolean>c, ~<number>c, !b);
