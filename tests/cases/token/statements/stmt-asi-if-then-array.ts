// xl:note ASI：`if (a) {}` 之后换行以 `[` 开头是**下一条语句**（块是语句、接不了下标）。
// 那个 `[` 在换行那一刻已经被 `IfSet` 的尾巴收成一个**开着**的括号单元，
// 向导逐字归还宿主之后才重新词法化成 `ArrayLiteral`——归还时要求 `End !== null` 的话
// 整格会静默消失（实测缺 `ArrayLiteral` / `CallExpression` / `PropertyAccessExpression`）
// xl:expect IfSet,IfBody,ArrayLiteral,PropertyAccess,Method
if (a) {}
[1].forEach(f)
