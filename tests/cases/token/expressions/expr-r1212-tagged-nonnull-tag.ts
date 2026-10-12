// xl:note 第 1212 轮（口径 1.1）收掉：`a!`x`` 的标签是一格 NonNullExpression——
// `a!`x`.b` 的产物是 `[NotNull([Identifier(a), !]), PropertyAccess([String(反引号), ., b])]`，
// 而 0c 的 `tagIsComplete` 那张名单里没有 NotNull ⇒ 模板那一段整段丢。
// 它与 IsParenBracket 同一档：这一格已经是一个完整的表达式。
// xl:round 1212
// xl:end
a!`x`.b;
