// xl:note 第 929 轮片段普查量到的一族：**名字与冒号之间夹注释**，而且后面还跟着一条语句。
// xl:known-gap `LabelCloseRule.Process` 把那一带的注释搬到 `Label` **左边**（它的说明里写着
// 位置只能放左边），于是语句壳的**第一格**成了那条注释 ⇒ `SplitShell` 的「头是不是标签」
// 当场为否 ⇒ 尾巴不拆 ⇒ 整段并成一个 `ExpressionStatement`
//（实测 `outer/*c*/: for(;;){…} g();` 与 `block/*c*/: {…} h(x);` 各 2 条）。
// xl:expect Label,AreaAnnotation,For,ForBody,Bracket
outer/*c*/: for (;;) { break outer; } g();
block/*c*/: { let x = 1; } h(x);
