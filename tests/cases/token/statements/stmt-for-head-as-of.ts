// xl:note 第 982 轮转绿：for 头左值上的 `as` / `satisfies` 要停在那个 `of` / `in` 上（`AsCloseRule.Process` 多认一格收工点，第一个实义单元不算——`for (a as of xs)` 里 `of` 就是类型名本身）
// xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody,As,Satisfies
for (a as any of xs) {}
for (a satisfies any in xs) {}
