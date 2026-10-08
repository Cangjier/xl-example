// xl:note 循环头部括号里出现 `)`：头部的右端必须按**配对**算，不能看见第一个 `)` 就收
//       （`HeaderCloseAt` 由收尾规则当场记下，投影直读；第 634 轮）
// xl:expect While,For,Foreach,DoWhile,WhileCompare,ForCompare,ForeachEnumable
let i = 0;
while (g(")")) ;
for (let j = 0; j < f(")"); j++) ;
for (const v of h(")")) ;
do ; while (k(")"));
function g(s: string) { return false; }
function f(s: string) { return 3; }
function h(s: string) { return [1]; }
function k(s: string) { return false; }
