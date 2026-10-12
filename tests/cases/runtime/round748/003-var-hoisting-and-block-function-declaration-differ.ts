// xl:title 提升：`var` 在整个函数里可见、函数声明在块里可调用
// xl:round 748
// xl:judge stdout
// xl:want differ
// xl:why 块里的**函数声明**在声明之前调用（`{ h(); function h() { … } }`）：JS 在**块**里
// xl:why 把函数声明提升到块顶（Node 照常打出 `block decl`），本仓报
// xl:why `cannot call a non-callable value`——**整份文件在这里断掉**。
// xl:why 根在「函数声明只往**函数层**提升」：`SetHoistedVars` / `CollectDeclaredNames` 那一族
// xl:why 认的是 `var` 与函数体顶层的声明，而**块级函数声明**（ES2015 起在块内是块作用域的）
// xl:why 没有被当成「块顶那一格先绑上」。
// xl:why 这一条与 `r748a-a04`（`in`）/`a09`（标签）**不是同一个根**：那两条都是过的。
// xl:end
// 本文件是 `p748a-a03` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

function f() { console.log("v", v); var v = 9; console.log("v2", v); }
f();
try { g(); function g() { console.log("hoisted decl"); } } catch (e) { console.log("decl threw", (e as Error).constructor.name); }
{ h(); function h() { console.log("block decl"); } }
console.log(typeof w, typeof (function () {}));
var w = 3;
