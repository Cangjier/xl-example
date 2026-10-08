// xl:note `do` 的体是一条 `if` 语句时整条仍是 `DoStatement`：`while (c);` 自带分号，
//       会先被语句层收成壳，而 `DoWhileCloseRule` 现在认得出「壳里的条件」这一形态（第 646 轮修）
// xl:expect DoWhile:4
// xl:absent While:4
let x = 0;
do if (x < 1) x++; while (x < 2);
do if (x < 3) { x++; } else { x--; } while (x < 4);
do { if (x < 5) x++; } while (x < 6);
do for (let i = 0; i < 1; i++) x++; while (x < 9);
console.log(x);
