// xl:note `do` 与循环体之间夹一条注释（第 907 轮片段普查量出）：TS 那边那条 `ExpressionStatement` 的区间从 `f` 起（`[8,12)`），产物从注释起（`[2,12)`）——注释被算进了体的区间
// xl:round 907
// xl:known-gap `do` 后面那一格取体的起点时走的是「`do` 的下一个单元」（没跳 trivia），注释于是成了体的第一个单元
// xl:end
do/*c*/ f(); while (1);
