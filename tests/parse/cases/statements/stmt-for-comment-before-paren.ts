// xl:note `for` 与它的头括号之间夹一条注释
// xl:known-gap 头部取括号只看紧邻那一格 ⇒ 整条 `for` 解体（缺 1 漂 1 多 5）
// xl:expect For,ForInitial,ForCompare,ForNext,ForBody
for /* c */ (let i = 0, j = 1; i < j; i++, j--) a();
