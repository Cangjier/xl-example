// xl:note **匿名**函数表达式带类型参数段：`function` 后面直接是 `<T>`，
// 那一格已经是 `GenericType`（既不是名字也不是括号）⇒ 认名字 + 参数表那一步不能因此判否
// xl:expect Function,FunctionBody,GenericType,TypeParameter,Method
(function <T>(x: T) { return x; })(1)
