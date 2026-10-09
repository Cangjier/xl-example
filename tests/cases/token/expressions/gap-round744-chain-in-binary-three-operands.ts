// xl:note 三个操作数、中间那个是下标调用链：`1 + o["f"]().v + 2`（第 744 轮登记的缺口）
// 第 863 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「再往后接一个运算符时 token 层换了一个形状」——续格 `().v` 与第二个 `+` 一起住进了
// 下一个二元单元，而 0a2 那一支只认「续格是外面的兄弟」⇒ 链头被当成整个第一个单元
// （缺 2 漂 1 多 3）。现在 `tailInOperator` 那一格认下了这种排版。
// xl:expect BinaryOperator,PropertyAccess,Bracket
const o: any = { f: () => ({ v: 1 }) };
const r = 1 + o["f"]().v + 2;
