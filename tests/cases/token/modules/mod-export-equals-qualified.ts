// xl:note `export = B.C`（导出赋值，右侧是限定名）：它没有对应的节点类型
//（`ExportAssignment` 在标签表里没有位置，`_notes.exports-no-node` 已登记），
// 所以这里只断言那条 `declare namespace` 照常成形。
// 这条用例原来的期望里写着 `TypeDefine`——那是把 `export = B.C` 的 `=` 当成了类型标注，是错的
// xl:expect Namespace,NamespaceBody,Class,ClassBody
// xl:absent TypeDefine
declare namespace B { class C {} }
export = B.C;
