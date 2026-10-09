// xl:note `instanceof` 右边那个实例化表达式（`b instanceof C<D>`）
// 第 894 轮：TS 那边是 `BinaryExpression(b, InstanceOfKeyword, ExpressionWithTypeArguments(C<D>))`
// —— 语法上就是实例化表达式，TS 另用一条**语法错**把它拦下来
//（`The right hand side of an instanceof expression must not be an instantiation expression`），
// 说明解析这一层确实这么读。两处缺口各一格：
//   ① token 层 `IsTypePosition` 不认识「`instanceof` 后面是类型位」⇒ `<…>` 退回比较运算符；
//   ② 投影层没有「被实例化的那头不在开头」那一支（0a 只看头一格）。
// 本仓原来的产物：缺 `ExpressionWithTypeArguments` + `TypeReference`、多一个
// `BinaryExpression(b instanceof C)`（实测片段：缺 2 / 漂 2 / 多 1）。
// `xl:expect` 只认**产物标签**（token 层那些）：`GenericType` / `Identifier` 是产物里的两格，
// `ExpressionWithTypeArguments` 与 `TypeReference` 是**投影**那一层的事，由 `cases:tsast` 那把尺子管。
// xl:expect BinaryOperator,Keyword,GenericType,Identifier
// xl:round 894
// xl:end
const a = b instanceof C<D>;
