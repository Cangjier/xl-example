// xl:note 条件类型约束里的函数类型：`extends (…) => any` 不能把 `(…)` 收成一次调用
// xl:expect FunctionType,Keyword
// xl:absent Method
type ThisParameterType<T> = T extends (this: infer U, ...args: never) => any ? U : never
