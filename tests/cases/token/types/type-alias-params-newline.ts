// xl:note 类型参数表可以另起一行（第 947 轮（三）收掉的那一格）：`type Y` 换行 `<T> = { a: T }`
// 在 TS 那边是**一条** `TypeAliasDeclaration`。收尾期从 `=` 右边那个 `{` 回扫会先撞上
// `Y` 与 `<T>` 之间那个换行，而 ASI 判据只看形状（`Y` 不要操作数、`<T>` 也不在它的续接表里）
// ⇒ 答「是边界」⇒ 右边那个 `{` 被收成**对象字面量**（实测缺 `TypeLiteral` /
// `PropertySignature` / `TypeReference` 各一、多 `ObjectLiteralExpression` / `PropertyAssignment` 各一）。
// 修法：收尾期也问一次**解析期那一句**（`Statement.IsDeclarationHeadAwaitingParameters`——
// 它本来就排在解析期 ASI 判据之前，所以壳一直开着），两半从此同口径。注释那一档同根。
// xl:expect TypeAssign,GenericType,TypeLiteral,Field
type Y
<T> = { a: T };
type Z // c
<U extends V = W> = { b: U };
