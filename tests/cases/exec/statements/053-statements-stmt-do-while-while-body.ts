// xl:title AST 语料 statements/stmt-do-while-while-body.ts：stmt do while while body
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note `do` 的体本身是一条 `while` 语句（第 656 轮）：体起点那一格永远不是终止符，
//       剩下两个 `while` 才是——`do while (a) x++; while (b);`
//  xl:expect DoWhile,While,WhileBody,WhileCompare,Statement
let a = false;
let b = false;
let x = 0;
let y = 0;
let z = 0;
do while (a) x++; while (b);
do { y++; } while (a && b);
do z++; while (b);
console.log(x, y, z, a, b);
