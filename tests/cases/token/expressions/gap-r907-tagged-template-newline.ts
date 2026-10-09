// xl:note 标签模板：标签与模板串之间换行（第 907 轮片段普查量出）：TS 那边是一条 `TaggedTemplateExpression`，产物在标签后收壳 ⇒ 整条断成两条语句
// xl:round 907
// 第 909 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来在
// `statement.xl.md` 的 `NextLineContinuesExpression` —— 解析期那张续接表里
// **没有模板串那一档**（收尾期的 `IsLineBreakBoundary` 里有），于是换行处收壳。
// 现在 `head === "`"` 直接答「续接」：`` ` `` 接在一条表达式后面**永远是**标签模板，
// 与 `<` 那一条同一个理由（真的另起一条语句时上面那句 `IsStatementBoundary` 早就早退了）。
// xl:expect Let:1,Identifier:2,InterpolationString:1,ConstString:2
// xl:end
const s = tag
`a${b}c`;
