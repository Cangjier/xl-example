// xl:note 导出赋值 `export = X`：现在没有任何节点（`export` 与 `=` 只是 Keyword + Symbol），
// 应当像 `export { … }` 一样有一个 `Export` 节点（带 `IsAssignment` 之类的标记）。
// `_notes.exports-no-node` 登记了这一块；真实语料 50 处 ExportAssignment
// xl:expect Export
// xl:absent TypeAssign,TypeDefine
export = foo;
