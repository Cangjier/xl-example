// xl:note 继承子句里的可选链：`extends a?.b` / `implements a?.b` 该投成带 `?.` 的属性访问
// （第 985 轮登记的缺口，第 1203 轮收掉：`heritage-clause.xl.md` 的 `ExpressionWithTypeArguments.PrintAst`
//   把「名字 + 恰好一格 `?.`」这一串整段交给 `ctx.Expression` —— 折链的算式只有
//   `print-ast-common.xl.md` 的 `projectExpression` 那一份。）
class D extends a?.b {}
class E implements a?.b {}
