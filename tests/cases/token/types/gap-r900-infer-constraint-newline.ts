// xl:note `infer` 的约束里 `extends` 后面换行（第 900 轮片段普查量出）：外层条件类型整条认不出来（`Array<` 与 `>` 留在原地，四格与真假分支一起丢，缺 10 格）
// xl:round 900
// xl:known-gap 约束段里的换行让 `infer V extends string` 先成了一次形，外层条件类型的回扫仍差一步——`InferType` 那一格已经放行，剩下的一步在约束段自己的边界上
// xl:expect ConditionalType:1
// xl:end
type T<U> = U extends Array<infer V extends
string> ? V : never;
