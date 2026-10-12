// xl:note `do` 与循环体之间夹一条注释（第 907 轮片段普查量出）：TS 那边那条 `ExpressionStatement` 的区间从 `f` 起（`[8,12)`），产物从注释起（`[2,12)`）——注释被算进了体的区间
// xl:round 907
// 第 907 轮当轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：根因在
// `do-while.xl.md` 的 `Process` 「体先断句」那一支——壳的起点原来取 `unit.Data[0]`，
// 而那一格可能是注释。现在取**第一格非 trivia**（上面那句 `bodyUnits` 用的就是同一口径），
// 体的区间于是从 `f` 起（TS 那条 `ExpressionStatement` 也是 `[8,12)`）。
// xl:expect DoWhile:1,WhileBody:1,WhileCompare:1,Method:1,AreaAnnotation:1
// xl:end
do/*c*/ f(); while (1);
