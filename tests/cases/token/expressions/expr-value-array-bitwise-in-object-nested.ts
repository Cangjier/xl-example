// xl:note 对象字面量值位的其它落点（第 686 轮，与 `expr-value-array-bitwise-in-object` 同族）：
// 嵌套对象与**计算键**。这一格靠**宿主**是 `ObjectLiteral` 来认——`Context` 是开括号那一刻
// 算的，个别形状上会算成 `"type"`（实测 `f({ z: [3 & 4] })` 里那个 `[`），所以不能只靠它。
// 见 `type-union.xl.md` 的 `IsTypeContainer`。
// xl:expect ObjectLiteral:3,ArrayLiteral:2
// xl:absent UnionType,IntersectionType,LiteralType
const a = { x: { y: [1 | 2] } };
const e = { [7 | 8]: 9 };
