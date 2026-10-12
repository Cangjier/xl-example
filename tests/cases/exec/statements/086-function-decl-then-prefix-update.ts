// xl:title 函数声明后面紧跟 `++`：那是**下一句的前缀**，不是后缀
// xl:round 692
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `exec/statements/r692-function-decl-then-update`；正文一字未动）。
// 判定点只有一个：**后缀 `++` / `--` 要一个引用**——
// `function f() {} ++n;` 里那个 `++` 属于下一句（函数声明不是操作数，折不成后缀），
// `class A {} ++m;` 同理。
let n = 0;
function f() {}
++n;
console.log(n, typeof f);
class A {}
let m = 0;
++m;
console.log(m, typeof A);
