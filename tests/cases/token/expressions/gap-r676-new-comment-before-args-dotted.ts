// xl:note 带点号的类型名与实参括号之间夹一条注释
// xl:expect New,NewType,NewArguments,BinaryOperator
// xl:known-gap 注释夹在 `new A.B` 与它的实参括号之间：实参被折成两层逗号运算符（`1, 2, 3` 与 `1, 2`），`new` 的实参段落空（与 `new C /* c */ (…)` 同族，带点号类型名三个实参另立一条，r676 探针 new-comment-before-args-two）
const a = new A.B /* c */ (1, 2, 3);
