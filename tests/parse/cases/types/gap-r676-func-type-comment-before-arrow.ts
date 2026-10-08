// xl:note 函数类型的形参括号与 `=>` 之间夹一条注释（类型位，不是箭头函数）
// xl:expect TypeAssign,TypeDefine
// xl:known-gap 注释夹在函数类型的 `=>` 之前：括号留在外面当 Bracket、`=>` 与返回类型落成散单元，`FunctionType` 整条缺（已登记的那两条是**泛型实参里**的同族；这里是类型别名右侧的裸位置，r676 探针 func-type-comment-before-arrow）
type F = (a: number) /* c */ => string;
