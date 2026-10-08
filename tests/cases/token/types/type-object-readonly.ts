// xl:note 对象类型字面量：只读属性。`readonly` 是**成员修饰词**，折进 `Field` 的 `modifiers`
//（与类字段的 `private` / `static` 同款），不再单独落成一个 `Keyword` 节点——
// 这条用例原来的期望写着 `Keyword`，那是 `Field` 还没收成员修饰词时的形状
// xl:expect TypeAssign,TypeDefine,TypeLiteral,TypeLiteralBody,Field
// xl:absent Keyword
type X = { readonly a: number }
