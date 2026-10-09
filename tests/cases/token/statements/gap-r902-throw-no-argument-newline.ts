// xl:note 没有表达式的 `throw` 后面换行（第 900 轮片段普查记在「待登记」那一栏的第 H 格、第 902 轮登记）：`throw` 换行 `}` 里 `ThrowStatement` 的 `expression` 字段本仓给 `[]`（TS 那边**有一个零宽 `Identifier`**），缺 1 格、字段名不符 1 处
// xl:round 902
// 第 906 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：TS 在 `throw` 后面没有表达式时
// **仍然**建一个零宽 `Identifier` 当 `expression`（`forEachChild` 会访问它），位置在
// **下一个实义单元**那一格；本仓只给空字段（尺子上是 `FIELD ThrowStatement 产物[] vs TS[expression]`
// 加一个 `MISS Identifier`）。
// **它其实不是「坏了以后的报错恢复」**（第 906 轮量清）：`function f(){ throw` 换行 `}` 在 TS 那边
// `parseDiagnostics` 是**空的**——只有同一行那种写法（`throw }` / `throw;`）才报
// "Expression expected."。所以这一条可以是一条普通语料用例。
// 补法在 `print-ast-common.xl.md` 的关键字语句那一格，与数组的洞补 `OmittedExpression` 同一先例。
// xl:expect Keyword:1,Identifier:2
// xl:end
function f(): never { throw
}
