// xl:note 属性名恰好是关键字 `import`（可选链形态）：这是成员名，不是导入声明
// 与 `expr-member-named-import` 同一个根因，走的是 `?.` 那一格——
// 判据必须把 `.` 与 `?.` 都认成「前一个实心单元是成员访问」。
// xl:expect Keyword:1
// xl:absent Import
const x = a?.import
