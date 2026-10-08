// xl:note `do` 的体自带 `;` 时（`do x++; while (c);`）整条仍是 `DoStatement`：
//       那个 `;` 会在 `while` 被读进来之前先把 `do x++` 收成一个语句壳，
//       而 `DoWhileCloseRule` 现在认得出「壳 + 条件」这一形态（第 635 轮修）
// xl:expect DoWhile:5,WhileBody:5
// xl:absent While:5
let x = 0;
do x++; while (x < 3);
do ; while (false);
do f(); while (false);
do x++
while (x < 4);
do { x++; } while (x < 5);
function f() {}
