// xl:known-gap 第 982 轮量出（整份文件缺 12 漂 0 多 4）：`as` 那一趟把 `for` 头上的 `of` 也当成了类型的一部分（`AsCloseRule.Process` 的终止符表里没有它）⇒ 括号里再也看不到那个 `of`，`ForeachCloseRule.Previous` 判否，整条 for-of 塌成 ExpressionStatement（第一个形状单独量：缺 ForOfStatement / AsExpression / Identifier 共 6、多 2）。
// xl:note `for (a as any of xs) {}`：`as` 右边那一段要停在 for 头那个 `of` 上
for (a as any of xs) {}
for (a satisfies any in xs) {}
