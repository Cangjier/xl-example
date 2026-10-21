// xl:note r1231 守卫：箭头函数体 `}` 之后换行再 `/` 是**新语句的正则**（不是除号）；
// 函数表达式体 `/` 与对象字面量 `/` 仍是除号（CanStartAt 只对 `=>` 体 + 换行放行）。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
const v1 = () => { }\n/re/g;
const v2 = function () { } / 2;
const v3 = { a: 1 } / 2;
