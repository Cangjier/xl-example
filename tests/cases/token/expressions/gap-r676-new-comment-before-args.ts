// xl:note new 的类型名与实参括号之间夹一条注释
// xl:expect New,NewType,NewArguments,BinaryOperator
// xl:known-gap 注释夹在 `new C` 与它的实参括号之间：实参那一段被折成逗号运算符（BinaryExpression `1, 2` + CommaToken），`new` 的实参段落空（r676 探针 new-comment-before-paren）
const a = new C /* c */ (1, 2);
