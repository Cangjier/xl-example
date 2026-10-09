// xl:note 函数类型的形参括号与 `=>` 之间夹一条注释（类型位，不是箭头函数）
// xl:expect TypeAssign,TypeDefine
type F = (a: number) /* c */ => string;
