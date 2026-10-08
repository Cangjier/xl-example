// xl:note 体是花括号的语句后面那个 `;` 自成一条空语句（第 663 轮；`if` 那一档原先是整份文件解析失败）
// xl:expect IfSet,While,Statement
if (a) {}
;
while (b) {
}
;
