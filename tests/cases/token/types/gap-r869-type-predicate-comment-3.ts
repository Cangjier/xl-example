// xl:note 第 869 轮普查量出的缺口（type-predicate-comment-3）：这一条钉的是上面那条根因的一个落点
// xl:known-gap `x is string` 里 `is` 与类型之间的注释 / 换行：类型谓词那一支的相邻判据没走 trivia 口径
function f(x: unknown): /*c*/ x is string { return true; }
