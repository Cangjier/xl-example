// xl:note 注释夹在 `type` 与名字、或者名字与 `=` 之间时，元组里 `...C[]` 的数组后缀落成值位的下标访问
// xl:round 917
// xl:known-gap 外层 `[` 的 `Context` 要靠 `DecideBracketContext` 往回扫到 `type`（注释在那条扫描里是 trivia），而内层 `C[]` 的空方括号那一刻还没关闭——`TypeBracketCloseRule` 要等外层升格成 `TupleType` 才够得着它，链规则（`PropertyAccessCloseRule`）却先折走了它，于是 `ArrayType` 与 `TypeReference` 各缺 2、多出两个 `ElementAccessExpression`（`type X = [C[]]` 的同一行写法没有这个时间差）
// xl:expect TupleType:2,RestType:2,PropertyAccess:2
// xl:end
type /*c*/X = [A, B?, ...C[]];
type Y /*c*/= [A, B?, ...C[]];
