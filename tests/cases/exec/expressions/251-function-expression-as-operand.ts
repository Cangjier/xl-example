// xl:title 函数表达式自己就是一个操作数（`typeof` / `!` / `+`）
// xl:round 692
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `exec/expressions/r692-function-expression-operand`；正文一字未动，
// 轮次留在 `xl:round` 那一格）。
// 判定点只有一个：**`IsOperand` 认不认 `Function` / `Class`**——
// `typeof function () {}`、`!function () {}`、`function () {} + 1` 三种位置都要成立
// （`!` 那一格曾经报 `unimplemented: expression ExclamationToken`、
//  `+` 那一格被读成前缀一元 ⇒ 报 `FunctionDeclaration`）。
// （`typeof function () {}` 那一格另在 `exec/expressions/241-typeof-and-void`、
//  `typeof class {}` 另在 `exec/classes/086-class-object-shape`，本条钉的是**一元与二元位置**那一半。）
const t = typeof function () { return 1; };
const n = !function () {};
const s = function () { return 2; } + 1;
console.log(t, n, s);
console.log(typeof class {});
