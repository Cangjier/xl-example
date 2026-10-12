// xl:note 标签模板的**标签本身又是一条标签模板**（第 1216 轮，用户口径 1.1）：`` a`x``x`.b `` 的产物是
// `[Identifier(a), String(反引号), PropertyAccess([String(反引号), ., Identifier(b)])]` —— 第二个模板
// 是**下一个兄弟** `PropertyAccess` 的第一个子单元，而 0b 那条「模板后面那一串是链的续格」的判据
// 先把**第一个**模板认成标签边界、把 `PropertyAccess` 当后缀 ⇒ 第二个模板整格丢
//（实测漂移 `TaggedTemplateExpression` `TS[10,17)` vs 产物 `[10,14)`、缺 `NoSubstitutionTemplateLiteral[14,17)`）。
// 判据补一档：紧跟其后的那一格**自己就是一条模板链**（它的第一个子单元是模板串）时，这一格不是边界，
// 交给 0c 那一支（「装着模板的那一格」）。六种前缀各一条。
// xl:expect String,PropertyAccess,Identifier,Method
const a1 = a`x``x`.b;
const a2 = f()`x``x`.b;
const a3 = a[0]`x``x`.b;
const a4 = a.b`x``x`.b;
const a5 = this`x``x`.b;
const a6 = (a)`x``x`.b;
const a7 = a`x``x`;
