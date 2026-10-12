// xl:note 环境函数的返回类型是 `import(...)` 类型查询
// xl:expect Function,ReturnType,TypeDefine,Method
// `import` 在声明尾部的终止词表里（它确实是声明开头），于是返回类型在 `import` 处被截断，
// `ReturnType` 里只剩一个光秃秃的冒号，`TypeDefine` 收不到内容、取 `items[-1].SourceRange`
// 抛裸 `TypeError`。带 `(` 的 `import(...)` 是类型查询，不是导入声明。
declare function f(): import('./m').A;
