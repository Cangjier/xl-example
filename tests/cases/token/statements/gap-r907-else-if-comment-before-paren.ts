// xl:note `else if` 的 `if` 与 `(` 之间夹一条注释（第 907 轮片段普查量出）：TS 那边整条是一条 `IfStatement`（`elseStatement` 是里层那条），产物的 `IfStatement` 停在第一个块上、`else` 成了 `Identifier`
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来在
// `IfSet.Navigate` —— 注释到达时 `if` 已经读完、`(` 还没到，尾巴是那条注释，
// 而接里层 `if` 的那一支要求 `tail instanceof Identifier` ⇒ 判不到。
// 现在多一格「`else` + `if` + trivia + `(`」：只在**当前这一格确实是 `(`** 时
// 跨过 trivia 往回找那一对（`SkipPreviousTrivia` 两跳），签法与 `else` 那一格一字不差。
// xl:expect IfSet:1,IfSegment:2,IfCondition:2,IfBody:2,AreaAnnotation:1,Identifier:2
// xl:end
if (a) {} else if/*c*/ (b) {}
