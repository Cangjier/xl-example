// xl:note 逗号（序列）表达式：只有 `( … )` 里的顶层 `,` 是运算符
//（参数表 / 调用实参表 / 数组 / 对象 / 变量声明的多声明符 / `for` 子句 / 语句层的 `,`
//  都不是运算符，判据要看那个 `(` 外面紧邻的实义单元是不是名字或语句关键字）
// `if (a, b)` 保守地不折：它的 `(` 已经被 `IfCondition` 吸收，判据看不到那个括号
// （宁可少折一个，也不能把参数表折成序列表达式）
// `for (…; …; i++, j--)` 的更新子句与语句层的 `a, b;` 都要折；
// 但枚举体的 `,` 是成员分隔符，不能折
// xl:expect BinaryOperator:3,JsonArray,JsonObject,Method:2,Enum
const r = (a, b);
if (a, b) {
}
const nest = f(g(a, b), c);
const arr = [1, 2];
const obj = { a: 1, b: 2 };
const multi = 1,
  other = 2;
function fn(p, q) {}
enum Color {
  Red,
  Green = 2,
}
for (let i = 0; i < n; i++, j--) {
}
i++, j--;
