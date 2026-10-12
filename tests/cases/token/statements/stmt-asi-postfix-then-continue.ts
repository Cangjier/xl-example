// xl:note 后缀 `x++` 之后换行是语句边界：`continue` 起一条新语句
// xl:expect Statement:3,UnaryOperator:1,Keyword:1
for (;;) { x++
continue }
