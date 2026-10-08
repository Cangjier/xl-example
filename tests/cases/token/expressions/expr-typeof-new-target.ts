// xl:note `typeof new.target`：`new.target` 是一格 MetaProperty，`typeof` 不能只吃掉 `new`
// xl:expect UnaryOperator,Keyword
function f(): string {
  return typeof new.target;
}
console.log(f());
