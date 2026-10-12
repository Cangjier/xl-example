// xl:note 类型位里的动态导入 `type T = import("m").X`：
// 别名整段是 `TypeAssign`，右侧的 `import("m")` 是一个**调用形状**（`Method`）后面接 `.X`。
// 标签表里没有 `ImportType` 这类节点，这一条正是 `_notes` 里登记的那类「没有对应标签」的形状。
// 这条用例原来的期望写着 `TypeDefine`——别名右侧没有冒号，那个期望不成立
// xl:expect TypeAssign,Method
// xl:absent TypeDefine
type T = import("m").X;
