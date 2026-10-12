// xl:note `new` 的被调者是一串成员访问（`new ns.C()`）时，**换行落在点号两侧**照样是一整条
// `NewExpression`——`NewCloseRule.Process` 的扫描遇到软换行就 `break`，`new ns` 先被折成一条
// `NewExpression`，`.` 随后被挂到它外面、那对括号又成了对它的又一次调用
// （第 937 轮收掉的那一族）。四档：点号前换行 / 点号后换行 / 点号前是行注释 / 点号后是行注释。
// xl:expect New,NewType,Identifier
const a = new ns
.C();
const b = new ns.
C();
const c = new ns // x
.C();
const d = new ns. // x
C();
