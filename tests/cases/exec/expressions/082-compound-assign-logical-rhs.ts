// xl:title 复合赋值的右侧是 `||`：逻辑规则位次造成的优先级（**还没修**）
// xl:round 373
// xl:judge stdout
// xl:end
// a += b || c 在 JS 里是 a += (b || c)。
// 这一条**还没修**：&& / || 那一条规则的位次**排在四则之前**（历史位次），
// 于是它先把 || 折了，而这时左边那一格还不是「整个 a + b」。
const flag = false;
let k = -1; k += 0 || 5; console.log("A", k);
let m = 10; m += 0 || 5; console.log("B", m);
console.log("C", flag || "x");
