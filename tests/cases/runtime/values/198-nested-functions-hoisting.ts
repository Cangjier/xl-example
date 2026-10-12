// xl:title 函数声明的提升与嵌套定义
// xl:round 371
// xl:judge stdout
// xl:end
console.log(typeof outer, outer());
function outer(): string { return "outer:" + inner(); }
function inner(): string { return "inner"; }
console.log(typeof inner);
function make(): string {
  const before = later();
  function later(): string { return "later"; }
  return before;
}
console.log(make());
const expr = function namedExpr(): string { return "named"; };
console.log(expr(), expr.name);
console.log(typeof hoisted, hoisted());
function hoisted(): string { return "h"; }
