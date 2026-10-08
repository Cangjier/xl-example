// xl:note `do…while` 后面还跟着一条语句
// xl:known-gap 那个 `while (a)` 被当成循环头，后面那条语句没被收进 `do` 那一格（缺 3）
// xl:expect DoWhile,Method
do {} while (a) b()
