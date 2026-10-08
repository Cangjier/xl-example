// xl:title 函数表达式自己就是一个操作数（`typeof` / `!` / `+`）
// xl:round 692
// xl:judge stdout
// xl:end
// **第 692 轮修的那一格**：`IsOperand` 认 `Class`（第 328 轮）却**不认 `Function`**，
// 于是三种写法一起断：`typeof function () {}`（投影只吐一个光秃秃的 `TypeOfKeyword`）、
// `!function () {}`（报 `unimplemented: expression ExclamationToken`）、
// `function () {} + 1`（`+` 被读成**前缀一元** ⇒ 降级层报 `FunctionDeclaration`）。
const t = typeof function () { return 1; };
const n = !function () {};
const s = function () { return 2; } + 1;
console.log(t, n, s);
console.log(typeof class {});
