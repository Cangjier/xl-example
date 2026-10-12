// 语料 13：**没接住的内建失败**——退出码与「报的是脚本抛出」都要对。
//
// 与 `09-uncaught-throw.ts` 同一个形状，区别是抛出者不是脚本自己写的 `throw`，
// 而是**内建**（第 121 轮之前这一条会以「语言层错误」收场，退出码同样是 1 ✓，
// 但归类不对 ✗：脚本能接住的东西与「这份程序根本装不起来」是两回事）。
//
// stdout 与退出码是这一份真正钉住的东西 ✓（stderr 的形态两边不作承诺）。

console.log("before", 1 + 1);
console.log("about-to-fail");

Object.keys(null);

console.log("unreachable");
