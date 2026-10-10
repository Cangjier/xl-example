// xl:note `switch` 体里**连着写**的 `case` 标签（第 934 轮收掉的 `gap-r933-switch-case-newline`
// 那一族）：换行落在**哪一个**冒号后面，切出来的都该是两条 `CaseClause` —— 段头的切分
// 由两个成形器共用同一份判据（`Statement.LastClauseHeadIndex`）。
// 守卫六档：全同行 / 第一个冒号后换行 / 第二个冒号后换行 / 三连 / 后面跟块 / 后面跟 `default`。
// xl:round 934
// xl:end
switch (x) { case 1: case 2: break; }
switch (x) { case 1:
case 2: break; }
switch (x) { case 1: case 2:
 break; }
switch (x) { case 1: case 2: case 3:
 break; }
switch (x) { case 1: case 2:
 { break; } }
switch (x) { case 1: case 2:
 break; default: break; }
