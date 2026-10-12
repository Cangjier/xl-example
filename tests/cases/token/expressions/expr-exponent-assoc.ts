// xl:expect UnaryOperator,BinaryOperator
// xl:note `**` 是右结合（`2 ** 3 ** 2` = 512），左结合那几个与显式括号同时钉住
// 第 164 轮：`**` 是**右结合**。
//
// `2 ** 3 ** 2` 在 JS 里是 `2 ** (3 ** 2)` = 512（不是 `(2 ** 3) ** 2` = 64）。
// token 层那一趟是**从左往右**找第一处能折的，所以原来先把左边那对折了，
// 树成了左套的 —— 这是**语义错**，不是「不支持」。
//
// 修法：这一格的右操作数之后**还跟着同一个运算符**时先放过，让更右那一处先折。
// 只列 `**`（JS 里右结合的二元运算符就它一个；赋值是另一套规则管的）。
//
// 这里同时钉住左结合的那些（`-` / `/` / `%`）与显式括号，免得改过头。

const a = 2;
const b = 3;
const c = 2;

// ① 右结合：不带括号的链
const chain = a ** b ** c;
const longer = 2 ** 3 ** 2 ** 1;
const mixed = a ** b ** c ** 1;

// ② 显式括号照旧（左结合是加括号才有的）
const lefted = (a ** b) ** c;
const grouped = (2 ** 3) ** 2;

// ③ 与左结合运算符混着写：`**` 比 `*` 紧
const withMul = 2 * 3 ** 2;
const withMul2 = 2 ** 3 * 2;
const withDiv = 8 / 2 ** 2;
const withSub = 10 - 2 ** 2;
const withMod = 10 % 3 ** 2;

// ④ 一元与幂：`-(2 ** 2)` 是负的 4，而 `(-2) ** 2` 是正的 4
const negated = -(2 ** 2);
const negativeBase = (-2) ** 2;

// ⑤ 小数指数与变量
const root = 2 ** 0.5;
const asChain = a ** b ** c;
