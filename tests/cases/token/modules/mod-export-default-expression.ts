// xl:note 默认导出表达式 `export default X`：现在只有 `Keyword` + 表达式，没有导出节点。
// 它和 `export { … }` 是一族（`Export` 节点 + `IsDefault` 标记），真实语料里
// ExportAssignment 50 处大部分是这一种
// xl:expect Export
export default foo;
