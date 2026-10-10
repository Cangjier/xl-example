// xl:known-gap 第 982 轮量出（整份文件缺 14 漂 0 多 4）：可选链那一趟把 `for` 头上的 `of` 吞进了 `NullConditionalOperator`（`?.` 之后那一趟一直收到括号末尾）⇒ 括号里看不到那个 `of`，`ForeachCloseRule.Previous` 判否，整条 for-of 塌成 ExpressionStatement（第一个形状单独量：缺 ForOfStatement / PropertyAccessExpression / QuestionDotToken 共 7、多 2）。
// xl:note `for (a?.b of xs) {}`：可选链要停在 for 头那个 `of` 上
for (a?.b of xs) {}
for (a?.b in xs) {}
