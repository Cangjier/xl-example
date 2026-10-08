// xl:title 函数声明后面紧跟 `++`：那是**下一句的前缀**，不是后缀
// xl:round 692
// xl:judge stdout
// xl:end
// **第 692 轮自己撞出来的回归**：把 `Function` 补进 `IsOperand` 之后，
// `function f() {} ++n;` 里 `++` 的**前一格**成了「操作数」⇒ 被读成**后缀**、
// 把函数声明折成了它的操作数（降级层报 `unimplemented: update expression on FunctionExpression`）。
// 判据是文法：后缀 `++` / `--` 要一个**引用**，字面量给不出来。
// `Class` 一并排掉（第 328 轮补它时漏了这一格）。
let n = 0;
function f() {}
++n;
console.log(n, typeof f);
class A {}
let m = 0;
++m;
console.log(m, typeof A);
