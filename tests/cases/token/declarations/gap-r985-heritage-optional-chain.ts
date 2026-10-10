// xl:known-gap 第 985 轮第十批底样（嵌套宿主）量出：**继承子句里的可选链**——`class D extends a?.b {}` / `class D implements a?.b {}` 在 TypeScript 那边是 `ExpressionWithTypeArguments > PropertyAccessExpression`（带 `QuestionDotToken`），而我们在这一格把它收成 `NullConditionalOperator`（`class D extends a?.b` 缺 `PropertyAccessExpression` / `QuestionDotToken` / `Identifier` 共 3、漂 0 多 0）。入手处：`heritage-clause.xl.md` 的投影只认 Identifier / PropertyAccess / GenericType，`NullConditionalOperator` 这一档没接上（同一个节点在值位是折得对的）。
// xl:note 继承子句里的可选链：`extends a?.b` 该投成带 `?.` 的属性访问
class D extends a?.b {}
class E implements a?.b {}
