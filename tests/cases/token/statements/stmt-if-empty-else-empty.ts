// xl:expect IfSet,IfStatement
// xl:note 两个分支都是空语句：`if (a) ; else ;` 的 then/else 各是一个 EmptyStatement
//（第 657 轮前这一条**整份文件解析失败**：`else` 被语句层收进壳里，摘它时抛「自身不在父单元的子单元里」）
if (a) ; else ;
