// xl:note 类型别名的右值是泛型函数类型：注释夹在 `=` 与 `<T>` 之间、换行夹在 `<T>` 与 `(` 之间
// xl:round 928
// 两处各自一格（都在第 928 轮第二趟的普查里量出来）：
// ① `IsLambdaParameters` 的泛型支只跳软换行——撞上注释就落到末尾那句「是形参表」
//   ⇒ 整段函数类型一个节点都不成形；
// ② `IsDeclarationHeadAwaitingParameters` 认不出「`type` + 名字 + `=` + `GenericType`」
//   这个「等着形参表」的形状 ⇒ 换行处收壳、类型别名只剩 `<T>`。
// xl:expect TypeAssign,GenericType,FunctionType,Parameter,Identifier,AreaAnnotation,Bracket,SymbolToken,TypeParameter,TypeDefine
// xl:end
type T =/*c*/<T>(a: T) => T;
type U = <U>
(a: U) => U;
