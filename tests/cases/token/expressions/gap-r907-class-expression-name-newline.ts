// xl:note 具名类表达式：`class` 与名字之间换行（第 907 轮片段普查量出）：TS 那边是 `ClassExpression`（带 `Identifier(Name)`），产物把 `class` 折成 `Identifier`、`Named {}` 落到别处（缺 `ClassExpression` / 名字，多出 `Block` / `EmptyStatement`）
// xl:round 907
// 第 912 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：`class` 那一格 `ExpectsOperand`
// 只认「`class` 后面就是体」，名字一插进来换行就落在名字上（一个写完的操作数）⇒ ASI 答
// 「这一行写完了」。补的是 `Statement.NextLineContinuesExpression` 的 `{` 那一支：
// 除 `IsHeaderBodyBrace` 之外再问 `ClassBranch.IsPendingHead`——它**直接问类自己的进门判据**
// `ScanHead`（名字 / 类型参数段 / `extends` / `implements` 各占哪几格、头有没有恰好用完），
// 不在这里重写第二份；`a.class` 换行 `{}` 由它自己的位置闸挡掉。
// xl:end
const A = class Named
 {};
