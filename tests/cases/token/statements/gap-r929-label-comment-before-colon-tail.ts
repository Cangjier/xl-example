// xl:note 第 929 轮片段普查量到的一族：**名字与冒号之间夹注释**，而且后面还跟着一条语句。
// xl:round 930
// 第 930 轮（三）转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：`LabelCloseRule.Process`
// 把那一带的注释搬到 `Label` **左边**（位置只能放左边），于是语句壳的**第一格**成了那条注释
// ⇒ `SplitShell` 的「头是不是标签」当场为否 ⇒ 尾巴不拆 ⇒ 整段并成一个 `ExpressionStatement`
//（实测 `outer/*c*/: for(;;){…} g();` 与 `block/*c*/: {…} h(x);` 各 2 条）。
// 现在 `SplitShell` 找头那一格时**跳过前导 trivia**，且只为「头是空 `Label`」那一档放行 ——
// `block /* c */: { … }` 那种「标签已经包住语句」的形状照旧早退（只判「是不是 Label」会漏掉它：
// `data.slice(1)` 从 1 起 ⇒ 标签搬进父亲又留在新壳里、注释一起消失，实测
// `decl-label-comment-after-name` 与 exec 的 `049-declarations-decl-label-block-comment` 当场红）。
// xl:expect Label:2,AreaAnnotation:2,For,ForBody,Method,Let,Bracket
// xl:end
outer/*c*/: for (;;) { break outer; } g();
block/*c*/: { let x = 1; } h(x);
