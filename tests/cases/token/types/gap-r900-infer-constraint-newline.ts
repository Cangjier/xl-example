// xl:note `infer` 的约束里 `extends` 后面换行（第 900 轮片段普查量出、第 902 轮转绿）：外层条件类型整条认不出来原来是（`Array<` 与 `>` 留在原地，四格与真假分支一起丢，缺 10 格）
// xl:round 900
// 第 902 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `InferTypeCloseRule.Previous` 要求父单元是**已经成形的类型容器**，而在根那一趟
// `infer` 的父单元还是 `Statement` ⇒ 整段不成形 ⇒ 外层条件类型的回扫跟着失败。
// 现在多认一格 `IsPendingTypePosition`（父单元是 `Root` / `Statement`、且往回扫到
// `extends` / `=` / `=>` ⇒ 这一段在类型位上）。
// xl:expect ConditionalType:1
// xl:end
type T<U> = U extends Array<infer V extends
string> ? V : never;
