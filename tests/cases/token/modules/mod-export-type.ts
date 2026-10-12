// xl:note 导出的类型别名：`export type T = number` 收成一个 `TypeAssign`，
// `export` 折进 `modifiers`。
// 这条用例原来的期望里写着 `TypeDefine`——但别名右侧没有冒号，
// `TypeDefine` 是「`: 类型`」那一段的节点（`type X = …` 的右侧直接属于 `TypeAssign`）
// xl:expect TypeAssign
// xl:absent TypeDefine
export type T = number;
