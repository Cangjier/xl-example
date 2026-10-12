// xl:note 第 1208 轮收掉：`this` 当标签模板的标签（`this`x``）。投影层那张「这一格算不算
// 链的一格」的名单里**一格关键字都没有**，于是 `this`x`` 整条不成形——标签与模板在产物里
// 是平级两格，通用支只投得出一格 `ThisKeyword`，**模板整格丢**；`this`x`.b` / `` this`x`(d) ``
// / `this`x`[c]` / `` this`x``x` `` / `this`x` as T` 五种续写同根（模板后面那一串本来有
// `chainOnto` 接着，是入口那一问先把整族挡掉了）。判据由关键字那一页按自己的正文答
// （`IsTagBaseNode`：关键字里只有 `this`；`super`x`` 在 TS 那边自己报语法错，不进名单）。
// `ts.createSourceFile` 实测 `const q = this`x``：
// `TaggedTemplateExpression[9,17) > [ThisKeyword[9,14), NoSubstitutionTemplateLiteral[14,17)]`。
// xl:round 1208
// xl:end
declare const tag: any;
let b: any;

const q1 = this`x`;
const q2 = this`x`.b;
const q3 = this`x`(b);
const q4 = this`x`[b];
const q5 = this`x``x`;
const q6 = this`x` as any;
const q7 = this`a${b}c`;
// **链尾那个裸的 `!`**（同一轮的第二个落点）：它是**非空断言**，不是声明的
// `exclamationToken`——TS 那边 `VariableDeclaration` 上没有 `exclamationToken`。
const q8 = this`x`!;
// 明确赋值断言那一格照旧（`!` 在 `=` 左边）
let d!: number;
