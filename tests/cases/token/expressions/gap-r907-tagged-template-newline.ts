// xl:note 标签模板：标签与模板串之间换行（第 907 轮片段普查量出）：TS 那边是一条 `TaggedTemplateExpression`，产物在标签后收壳 ⇒ 整条断成两条语句
// xl:round 907
// xl:known-gap 解析期的 ASI 续接表（`NextLineContinuesExpression`）认 `|` / `&` / `.` / `(` / `[` 那几个字符，**没有模板串那一档**（`` ` `` 起头）；收尾期的 `IsLineBreakBoundary` 表里是有「模板串」的，两处不是同一张
// xl:end
const s = tag
`a${b}c`;
