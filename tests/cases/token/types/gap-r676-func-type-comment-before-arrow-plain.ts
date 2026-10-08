// xl:note 无参函数类型的形参括号与 `=>` 之间夹一条注释
// xl:expect TypeAssign,Keyword
// xl:known-gap 注释夹在函数类型的 `=>` 之前：空括号留在外面当 `ParenthesizedType`、返回类型缺、`FunctionType` 整条缺（与带形参那条同族，空形参表另立一条，r676 探针 func-type-comment-before-arrow-plain）
type F = () /* c */ => void;
