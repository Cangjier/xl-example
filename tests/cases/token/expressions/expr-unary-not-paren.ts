// xl:note `!(…)` 一元否定：`const a = !(b instanceof C)` 与 `return !(q instanceof R)`
//（`return` 在 KeywordReorganization 之前还是 Identifier，被 NotNullReorganization 当成被断言者，
//  于是 `!` 与 `return` 被收成一个 NotNull，括号里的表达式拿不到一元节点）
// xl:expect UnaryOperator:4,BinaryOperator
const a = !(b instanceof C);
const c = !(d === e);
const f = !g;
function p() {
  return !(q instanceof R);
}
