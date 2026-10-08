// xl:title AST 语料 expressions/expr-ternary-arrow-branches.ts：expr ternary arrow branches
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note 三元的两支都是箭头函数（不套括号）——体必须在平级 `:` 之前收住
//  xl:expect TernaryOperator,Lamda
const flag = true;
const add = flag ? (a: number) => a + 1 : (a: number) => a - 1;
console.log(add(5));
const pick = flag ? () => "yes" : () => "no";
console.log(pick());
