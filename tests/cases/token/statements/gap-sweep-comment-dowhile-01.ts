// xl:note SWEEP-comment/dowhile 落点（657 审计语料）
// xl:expect AreaAnnotation,DoWhile,Identifier,LineAnnotation:3,Method,Root,Statement:5,WhileBody,WhileCompare
// 第 843 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 「体与 `while` 之间那条注释没跨过去」⇒ `do` 整条退回 `WhileCloseRule`
//（`do-while.xl.md` 的 `BodyEnd` / `Previous` / `Process`，第 843 轮改成跨 trivia 并收下注释）。
do { a(); } /*c*/while (b);
