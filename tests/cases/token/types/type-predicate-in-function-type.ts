// xl:note 函数类型的返回位也可以是谓词：`(value: T) => value is string`（第 66 轮第三批）
// xl:expect TypePredicate,FunctionType,TypeAssign
type P<T> = (value: T) => value is string;
