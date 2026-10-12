// xl:note 第 982 轮转绿：for 头左值上的可选链要停在那个 `of` / `in` 上（`NullConditionalOperatorCloseRule` 的断点表多认这两个词，第一个实义单元不算——`a?.of` 里那个 `of` 是成员名）
// xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody,NullConditionalOperator
for (a?.b of xs) {}
for (a?.b in xs) {}
