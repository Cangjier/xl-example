// xl:title AST 语料 expressions/expr-typeof-new-target.ts：expr typeof new target
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note `typeof new.target`：`new.target` 是一格 MetaProperty，`typeof` 不能只吃掉 `new`
//  xl:expect UnaryOperator,Keyword
function f(): string {
  return typeof new.target;
}
console.log(f());
