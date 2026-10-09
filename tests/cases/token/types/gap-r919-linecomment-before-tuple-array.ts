// xl:note 行注释（`//c`）贴在类型位那对方括号附近：与块注释那一族同形，只是落在 `LineAnnotation` 上
// xl:round 919
// xl:known-gap 注释在 `DecideBracketContext` 的回扫里是 trivia，所以外层 `[` 的 `Context` 判得对；可内层 `C[]` 的空方括号那一刻还没关闭（它的内容也是空的），`TypeBracketCloseRule` 要等外层升格成 `TupleType` 才够得着它，链规则（`PropertyAccessCloseRule`）先把它折成了 `PropertyAccess` ⇒ `ArrayType` 与 `TypeReference` 各缺 2、多出两个 `ElementAccessExpression`。与 `gap-r917-comment-before-type-bracket` **同一个根**，差的是插入物是行注释还是块注释（`LineAnnotation` vs `AreaAnnotation`）
// xl:expect TupleType:2,RestType:2,PropertyAccess:2
// xl:end
type X //c
= [A, B?, ...C[]];
type X2 = //c
[A, B?, ...C[]];
