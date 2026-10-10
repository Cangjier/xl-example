// xl:note 第 929 轮片段普查量到的一格：被标语句是**调用**时，名字与 `(` 之间换行。
// xl:known-gap 解析期的续接表在「标签的体」这一侧没认「下一行以 `(` 开头」⇒ 换行处收壳
// ⇒ 被调用者 `f` 与调用括号分家（TS 那边 `f` 换行 `()` 是一个 `CallExpression`）。
// xl:expect Label,Bracket,Identifier
done: f
();
