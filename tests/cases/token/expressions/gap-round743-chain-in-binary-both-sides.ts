// xl:note 下标调用链当**两边**的操作数：`o["f"]().v + o["f"]().v`（第 743 轮登记的缺口）
// 第 858 轮收掉：左操作数那一侧的链由 `BinaryOperatorCloseRule.Process` 往前收基名
//（与 `As` / NCO 那两支同一个形状），`+` 的两边于是都拿到完整的一格链。
const o: any = { f: () => ({ v: 1 }) };
const r = o["f"]().v + o["f"]().v;
