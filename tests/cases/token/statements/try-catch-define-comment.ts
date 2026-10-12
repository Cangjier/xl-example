// xl:note `catch` 形参与右括号之间夹一条注释（第 902 轮片段普查量出的第 G 格）：产物原来把那条注释算进 `CatchDefine` / `TypeDefine` 的区间 ⇒ 投影出来的 `VariableDeclaration` 右界多出注释那一段（TS 给 [14,24)、产物给 [14,29)）
// xl:round 902
// xl:end
// 第 902 轮同一轮收掉（`TypeDefineCloseRule.Process` 的终点跳过尾部注释，`IsAnnotationUnit`），
// 用例留着当守卫：
try {} catch (e: unknown/*c*/) {}
