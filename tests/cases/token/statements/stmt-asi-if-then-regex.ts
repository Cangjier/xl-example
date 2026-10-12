// xl:note ASI：`if (a) {}` 之后换行以正则字面量开头是**下一条语句**。
// 向导尾巴上那个开着的 `RegexToken` 要逐字归还，宿主才知道 `/` 起的是正则
// xl:expect IfSet,IfBody,RegexToken,PropertyAccess
if (a) {}
/x/.test(b)
