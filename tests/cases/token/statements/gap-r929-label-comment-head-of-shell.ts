// xl:note 第 929 轮片段普查量到的同族另一格：注释落在**语句壳的第一格**上。
// xl:round 930
// 第 930 轮（三）转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：与
// `gap-r929-label-comment-before-colon-tail` 同一个根（壳的头不是标签就不拆尾巴），
// 只是这里的注释来自标签前面（函数体的开头）⇒ 尾巴 `return 1;` 被一起吞进标签那一格
//（实测 `function h() { /*c*/ lbl: {…} return 1; }` 一族 4 条）。
// 现在 `SplitShell` 跳过前导 trivia 之后认得出那个 `Label`，尾巴另收一条壳。
// xl:expect Label,Function,FunctionBody,AreaAnnotation,Keyword
// xl:end
function h() { /*c*/ lbl: { break lbl; } return 1; }
