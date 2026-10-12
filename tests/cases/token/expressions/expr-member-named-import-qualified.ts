// xl:note 限定名末段是关键字 `import`：`ns.a.import` 里的 `import` 是属性名
// 前一个实义单元是 `.`，所以它不是导入声明——判据看的是**紧邻**那一格，
// 与限定名有多长无关。
// xl:expect Keyword:1
// xl:absent Import
const x = ns.a.import
