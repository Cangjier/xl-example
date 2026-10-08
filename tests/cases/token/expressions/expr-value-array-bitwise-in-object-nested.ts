// xl:note 对象字面量值位的其它落点（第 686 轮，与 `expr-value-array-bitwise-in-object` 同族）：
// 嵌套对象、**计算键**、以及**值是括号**（`{ v: (7 | 8) }`）。前两格靠**宿主**是
// `ObjectLiteral` 来认（`Context` 是开括号那一刻算的，个别形状上会算成 `"type"`），
// 括号那一格靠 `IsTypeBracketPosition` 的冒号支问一次 `EnclosingBraceContext`——
// 见 `type-union.xl.md` 的 `IsTypeContainer` 与 `text-common-util.xl.md`。
// xl:expect ObjectLiteral:4,ArrayLiteral:2,Bracket
// xl:absent UnionType,IntersectionType,LiteralType
const a = { x: { y: [1 | 2] } };
const e = { [7 | 8]: 9 };
const c = { v: (10 | 11) };
